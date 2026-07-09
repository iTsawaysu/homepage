import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, posix, relative, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const publicDir = join(root, "public");
const assetUrlPrefix = "/assets/homepage/";
const assetPublicDir = join(publicDir, "assets/homepage");

const scanTargets = [
  {
    label: "src",
    path: join(root, "src"),
    recursive: true,
    extensions: new Set([
      ".astro",
      ".css",
      ".html",
      ".js",
      ".json",
      ".md",
      ".mjs",
      ".ts",
    ]),
  },
  {
    label: "manifest",
    path: join(root, "public/manifest.json"),
  },
  {
    label: "service worker",
    path: join(root, "public/service-worker.js"),
  },
  {
    label: "css",
    path: join(root, "public/assets/homepage/css"),
    recursive: true,
    extensions: new Set([".css"]),
    scanCssUrls: true,
  },
  {
    label: "legacy js",
    path: join(root, "public/assets/homepage/js/main.js"),
  },
];

const errors = [];
const notes = [];
const references = new Map();
const sourceFiles = new Map();
const ignoredSourceMaps = [];
const ignoredFilesystemNames = new Set([".DS_Store", "Thumbs.db"]);
const ignoredFilesystemPrefixes = ["._"];

const toProjectPath = (path) => relative(root, path).split(sep).join("/");

const readText = (path) => readFileSync(path, "utf8");

const fail = (message) => {
  errors.push(message);
};

const note = (message) => {
  notes.push(message);
};

const shouldIgnoreFilesystemEntry = (name) =>
  ignoredFilesystemNames.has(name) ||
  ignoredFilesystemPrefixes.some((prefix) => name.startsWith(prefix));

const walkFiles = (dir, options = {}) => {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (shouldIgnoreFilesystemEntry(entry.name)) {
      continue;
    }

    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(path, options));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (options.extensions && !options.extensions.has(extname(entry.name))) {
      continue;
    }

    files.push(path);
  }

  return files.sort((a, b) => a.localeCompare(b));
};

const registerSourceFile = (path, target) => {
  const existing = sourceFiles.get(path) ?? {
    path,
    labels: new Set(),
    scanCssUrls: false,
  };

  existing.labels.add(target.label);
  existing.scanCssUrls ||= Boolean(target.scanCssUrls);
  sourceFiles.set(path, existing);
};

const collectSourceFiles = () => {
  for (const target of scanTargets) {
    if (!existsSync(target.path)) {
      fail(`Scan target does not exist: ${toProjectPath(target.path)}`);
      continue;
    }

    if (target.recursive) {
      for (const path of walkFiles(target.path, {
        extensions: target.extensions,
      })) {
        registerSourceFile(path, target);
      }

      continue;
    }

    registerSourceFile(target.path, target);
  }
};

const stripQueryAndHash = (url) => url.split(/[?#]/, 1)[0];

const unquoteCssUrl = (value) => {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const normalizeUrlPath = (url) => {
  const withoutDecorators = stripQueryAndHash(url.trim());

  try {
    return decodeURI(withoutDecorators);
  } catch {
    return withoutDecorators;
  }
};

const isExternalOrInlineUrl = (url) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url);

const publicPathForAssetUrl = (url) =>
  join(publicDir, normalizeUrlPath(url).replace(/^\//, ""));

const assetUrlForPublicFile = (path) =>
  `/${relative(publicDir, path).split(sep).join("/")}`;

const addReference = (url, sourcePath, raw, kind) => {
  const normalizedUrl = normalizeUrlPath(url);

  if (!normalizedUrl.startsWith(assetUrlPrefix)) {
    return;
  }

  const publicPath = publicPathForAssetUrl(normalizedUrl);
  const key = toProjectPath(publicPath);
  const reference = references.get(key) ?? {
    url: normalizedUrl,
    publicPath,
    occurrences: [],
  };

  reference.occurrences.push({
    source: toProjectPath(sourcePath),
    raw,
    kind,
  });
  references.set(key, reference);
};

const stripSourceMapReferences = (source, sourcePath) => {
  const recordIgnoredSourceMap = (rawUrl) => {
    const url = normalizeUrlPath(rawUrl);

    if (url.endsWith(".map")) {
      ignoredSourceMaps.push({
        source: toProjectPath(sourcePath),
        url,
      });
    }
  };

  return source
    .replace(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/g, (_match, url) => {
      recordIgnoredSourceMap(url);
      return "";
    })
    .replace(/\/\*[#@]\s*sourceMappingURL=([^*]+?)\*\//g, (_match, url) => {
      recordIgnoredSourceMap(url.trim());
      return "";
    });
};

const collectAbsoluteAssetUrls = (source, sourcePath) => {
  const pattern = /\/assets\/homepage\/[^\s"'`<>)\\]+/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    addReference(match[0], sourcePath, match[0], "absolute");
  }
};

const resolveCssUrl = (value, sourcePath) => {
  const url = unquoteCssUrl(value);

  if (!url || isExternalOrInlineUrl(url)) {
    return null;
  }

  if (url.startsWith("/")) {
    return normalizeUrlPath(url);
  }

  const sourceUrl = assetUrlForPublicFile(sourcePath);
  const resolved = posix.normalize(posix.join(dirname(sourceUrl), url));

  return resolved.startsWith("/") ? resolved : `/${resolved}`;
};

const collectCssUrls = (source, sourcePath) => {
  const pattern = /url\(\s*([^)]*?)\s*\)/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const resolved = resolveCssUrl(match[1], sourcePath);

    if (!resolved) {
      continue;
    }

    addReference(resolved, sourcePath, match[0], "css-url");
  }
};

const collectAssetFiles = () =>
  new Set(walkFiles(assetPublicDir).map((path) => toProjectPath(path)));

collectSourceFiles();

for (const source of sourceFiles.values()) {
  const text = stripSourceMapReferences(readText(source.path), source.path);

  collectAbsoluteAssetUrls(text, source.path);

  if (source.scanCssUrls) {
    collectCssUrls(text, source.path);
  }
}

const assetFiles = collectAssetFiles();
const missing = [];

for (const reference of references.values()) {
  if (assetFiles.has(toProjectPath(reference.publicPath))) {
    continue;
  }

  missing.push(reference);
}

const referencedAssetFiles = new Set(references.keys());
const unused = [...assetFiles]
  .filter((path) => !referencedAssetFiles.has(path))
  .sort((a, b) => a.localeCompare(b));

if (ignoredSourceMaps.length > 0) {
  note(`Ignored ${ignoredSourceMaps.length} sourceMappingURL .map reference(s).`);
}

note(`Scanned ${sourceFiles.size} source file(s).`);
note(`Found ${assetFiles.size} current asset file(s).`);
note(`Found ${referencedAssetFiles.size} referenced asset file(s).`);
note(`Missing current same-origin asset reference(s): ${missing.length}.`);
note(`Unused asset candidate(s): ${unused.length}.`);

if (missing.length > 0) {
  console.error("Asset reference check failed:");

  for (const reference of missing) {
    console.error(`- Missing ${reference.url} -> ${toProjectPath(reference.publicPath)}`);

    for (const occurrence of reference.occurrences) {
      console.error(`  referenced by ${occurrence.source} (${occurrence.kind}: ${occurrence.raw})`);
    }
  }

  process.exit(1);
}

console.log("Asset reference check passed:");

for (const message of notes) {
  console.log(`- ${message}`);
}

if (unused.length > 0) {
  console.log("Unused asset candidates:");

  for (const path of unused) {
    console.log(`- ${path}`);
  }
}
