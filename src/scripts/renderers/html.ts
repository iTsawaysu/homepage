const legacyHtmlEntities: Record<string, string> = {
  "&": "&#38;",
  "<": "&#60;",
  ">": "&#62;",
  '"': "&#34;",
  "'": "&#39;",
  "/": "&#47;",
};

const legacyHtmlEncodePattern = /&(?!#?\w+;)|<|>|"|'|\//g;

export const escapeLegacyHtml = (value: unknown): string => {
  if (!value) {
    return "";
  }

  return String(value).replace(
    legacyHtmlEncodePattern,
    (character) => legacyHtmlEntities[character] ?? character,
  );
};

export const renderLegacyRaw = (value: unknown): string => String(value);

export const renderLegacyRawList = (
  values: readonly unknown[] | null | undefined,
  renderItem: (value: unknown, index: number) => string,
): string => {
  if (!values) {
    return "";
  }

  return values.map((value, index) => renderItem(value, index)).join("");
};

const stripLegacyTemplateStatic = (value: string): string =>
  value
    .replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g, " ")
    .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "");

export const renderLegacyTemplate = (
  strings: TemplateStringsArray,
  ...values: string[]
): string =>
  strings.reduce(
    (output, value, index) => `${output}${stripLegacyTemplateStatic(value)}${values[index] ?? ""}`,
    "",
  );
