import { getGsapEngine } from "../animation/gsap";
import type { NativeAnalytics } from "./analytics";
import { getRouteLifecycle } from "./route-lifecycle";

const DESKTOP_QUERY = "(min-width: 1024px)" as const;
const LOGO_TEXT = "iTsawaysu" as const;
const LOGO_REVEAL_CHARACTERS = "iTsawaysu01" as const;

type LogoAnimationTargets = {
  logo: HTMLElement;
  logoLink: HTMLElement;
  logoSvg: SVGSVGElement;
  logoAvatar: SVGElement;
  logoAvatarRing: SVGElement;
  logoPanel: SVGElement;
  logoAccent: SVGElement;
  logoSheen: SVGElement;
  logoText: SVGTextElement;
};

const debounce = (callback: () => void, delayMs: number): (() => void) => {
  let timeout = 0;

  return () => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(callback, delayMs);
  };
};

const getElementOffset = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
};

const createElementClone = (source: HTMLElement): void => {
  document.querySelector(".element-clone")?.remove();

  const clone = document.createElement("div");
  const offset = getElementOffset(source);

  clone.className = "element-clone";
  clone.style.height = `${source.offsetHeight}px`;
  clone.style.width = `${source.offsetWidth}px`;
  clone.append(source.cloneNode(true));
  document.body.append(clone);

  getGsapEngine().set(clone, {
    left: offset.left,
    top: offset.top,
    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
  });
};

const setMenuListHeight = (isOpen: boolean): void => {
  const navList = document.querySelector<HTMLElement>(".primary-nav ul");

  if (!navList) {
    return;
  }

  if (!isOpen) {
    navList.style.height = "auto";
    return;
  }

  const marginTop = Number.parseInt(
    window.getComputedStyle(navList).marginTop,
    10,
  );
  navList.style.height = `${window.innerHeight - (Number.isFinite(marginTop) ? marginTop : 0)}px`;
};

const setHeaderWrapSize = (): void => {
  const headerWrap = document.querySelector<HTMLElement>(".header-wrap");

  if (!headerWrap) {
    return;
  }

  headerWrap.style.width = `${window.innerWidth}px`;
  headerWrap.style.height = `${window.innerHeight}px`;
};

const animateMenuButton = (isOpen: boolean): void => {
  const gsap = getGsapEngine();
  const tl = ".menu .box.tl";
  const tr = ".menu .box.tr";
  const bl = ".menu .box.bl";
  const br = ".menu .box.br";

  if (!isOpen) {
    gsap.set([tl, tr, bl, br], { clearProps: "all" });
    return;
  }

  gsap.to(tl, {
    backgroundColor: "#fff",
    left: 0,
    top: 0,
    height: 30,
    rotation: 45,
    duration: 0.25,
    ease: "expo.out",
  });
  gsap.to(tr, {
    backgroundColor: "#fff",
    right: 0,
    top: 0,
    height: 30,
    rotation: -45,
    duration: 0.25,
    ease: "expo.out",
  });
  gsap.to(bl, {
    autoAlpha: 0,
    left: 0,
    bottom: 0,
    duration: 0.25,
    ease: "expo.out",
  });
  gsap.to(br, {
    autoAlpha: 0,
    right: 0,
    bottom: 0,
    duration: 0.25,
    ease: "expo.out",
  });
};

const animateMenuHover = (isHovering: boolean): void => {
  const menu = document.querySelector<HTMLElement>(".header .menu");

  if (!menu || menu.classList.contains("active")) {
    return;
  }

  const gsap = getGsapEngine();

  if (isHovering) {
    gsap.to(".menu .box.tl", {
      left: -20,
      top: -20,
      duration: 0.2,
      ease: "expo.out",
    });
    gsap.to(".menu .box.tr", {
      right: -20,
      top: -20,
      duration: 0.2,
      ease: "expo.out",
    });
    gsap.to(".menu .box.bl", {
      left: -20,
      bottom: -20,
      duration: 0.2,
      ease: "expo.out",
    });
    gsap.to(".menu .box.br", {
      right: -20,
      bottom: -20,
      duration: 0.2,
      ease: "expo.out",
    });
    return;
  }

  gsap.to(".menu .box", {
    left: "",
    right: "",
    top: "",
    bottom: "",
    duration: 0.2,
    ease: "expo.out",
    clearProps: "left,right,top,bottom",
  });
};

let lockedScrollY = 0;

const isMobileMenuViewport = (): boolean =>
  !window.matchMedia(DESKTOP_QUERY).matches;

const lockBodyScroll = (): void => {
  lockedScrollY = window.scrollY;
  const body = document.body;
  body.style.position = "fixed";
  body.style.top = `-${lockedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.classList.add("menu-open");
};

const unlockBodyScroll = (): void => {
  const body = document.body;

  if (!body.classList.contains("menu-open")) {
    return;
  }

  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.classList.remove("menu-open");
  window.scrollTo(0, lockedScrollY);
};

const setBackgroundInert = (inert: boolean): void => {
  const main = document.querySelector<HTMLElement>("main#main");

  if (!main) {
    return;
  }

  if (inert) {
    main.setAttribute("inert", "");
    main.setAttribute("aria-hidden", "true");
  } else {
    main.removeAttribute("inert");
    main.removeAttribute("aria-hidden");
  }
};

const closeMenu = (options?: { restoreFocus?: boolean }): void => {
  const menu = document.querySelector<HTMLElement>(".header .menu");
  const primaryNav = document.querySelector<HTMLElement>(".primary-nav");
  const headerWrap = document.querySelector<HTMLElement>(".header-wrap");
  const wasOpen = menu?.classList.contains("active") ?? false;

  menu?.classList.remove("active");
  primaryNav?.classList.remove("active");
  headerWrap?.classList.remove("active");
  menu?.setAttribute("aria-expanded", "false");
  setMenuListHeight(false);
  animateMenuButton(false);

  if (wasOpen) {
    unlockBodyScroll();
    setBackgroundInert(false);

    if (options?.restoreFocus) {
      menu?.focus();
    }
  }
};

const toggleMenu = (): void => {
  const menu = document.querySelector<HTMLElement>(".header .menu");
  const primaryNav = document.querySelector<HTMLElement>(".primary-nav");
  const headerWrap = document.querySelector<HTMLElement>(".header-wrap");

  if (!menu || !primaryNav || !headerWrap) {
    return;
  }

  const isOpen = !menu.classList.contains("active");

  menu.classList.toggle("active", isOpen);
  primaryNav.classList.toggle("active", isOpen);
  headerWrap.classList.toggle("active", isOpen);
  menu.setAttribute("aria-expanded", isOpen ? "true" : "false");
  setMenuListHeight(isOpen);
  animateMenuButton(isOpen);

  if (isOpen) {
    if (isMobileMenuViewport()) {
      lockBodyScroll();
      setBackgroundInert(true);
    }
  } else {
    unlockBodyScroll();
    setBackgroundInert(false);
  }
};

const initMenu = (): void => {
  const menu = document.querySelector<HTMLElement>(".header .menu");
  const primaryNav = document.querySelector<HTMLElement>(".primary-nav");

  if (menu) {
    menu.setAttribute("aria-expanded", "false");

    if (primaryNav) {
      if (!primaryNav.id) {
        primaryNav.id = "primary-nav";
      }
      menu.setAttribute("aria-controls", primaryNav.id);
    }
  }

  menu?.addEventListener("click", (event) => {
    event.preventDefault();
    toggleMenu();
  });
  menu?.addEventListener("mouseover", () => {
    if (document.documentElement.classList.contains("no-touchevents")) {
      animateMenuHover(true);
    }
  });
  menu?.addEventListener("mouseout", () => {
    if (document.documentElement.classList.contains("no-touchevents")) {
      animateMenuHover(false);
    }
  });

  if (primaryNav && !primaryNav.querySelector(".overlay")) {
    const overlay = document.createElement("i");
    overlay.className = "overlay";
    primaryNav.append(overlay);
    overlay.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menu?.classList.contains("active")
    ) {
      closeMenu({ restoreFocus: true });
    }
  });

  setHeaderWrapSize();
  window.addEventListener("resize", debounce(setHeaderWrapSize, 250));
  window.addEventListener("scroll", debounce(setHeaderWrapSize, 250));
};

const initHeaderScroll = (): void => {
  const header = document.querySelector<HTMLElement>(".header");
  let previousScrollTop = window.scrollY;

  if (!header) {
    return;
  }

  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const headerHeight = header.offsetHeight;

    if (scrollTop > previousScrollTop && scrollTop >= headerHeight) {
      header.classList.add("dark", "hide", "shadow-z2");
    } else if (scrollTop <= headerHeight) {
      header.classList.remove("dark", "hide", "shadow-z2");
    } else {
      header.classList.remove("hide");
    }

    previousScrollTop = scrollTop;
  });
};

const getLogoAnimationTargets = (): LogoAnimationTargets | null => {
  const logo = document.querySelector<HTMLElement>(".logo");
  const logoLink = document.querySelector<HTMLElement>(".logo a");
  const logoSvg = document.querySelector<SVGSVGElement>(".logo svg");
  const logoAvatar = document.querySelector<SVGElement>(".site-logo-avatar");
  const logoAvatarRing = document.querySelector<SVGElement>(
    ".site-logo-avatar-ring",
  );
  const logoPanel = document.querySelector<SVGElement>(".site-logo-panel");
  const logoAccent = document.querySelector<SVGElement>(".site-logo-accent");
  const logoSheen = document.querySelector<SVGElement>(".site-logo-sheen");
  const logoText = document.querySelector<SVGTextElement>(".site-logo-text");

  if (
    !logo ||
    !logoLink ||
    !logoSvg ||
    !logoAvatar ||
    !logoAvatarRing ||
    !logoPanel ||
    !logoAccent ||
    !logoSheen ||
    !logoText
  ) {
    return null;
  }

  return {
    logo,
    logoLink,
    logoSvg,
    logoAvatar,
    logoAvatarRing,
    logoPanel,
    logoAccent,
    logoSheen,
    logoText,
  };
};

const sampleLogoRevealCharacter = (): string =>
  LOGO_REVEAL_CHARACTERS[
    Math.floor(Math.random() * LOGO_REVEAL_CHARACTERS.length)
  ] ?? "█";

const revealLogoText = (logoText: SVGTextElement): void => {
  const stepMs = 40;
  const durationMs = 760;
  const totalSteps = Math.max(1, Math.ceil(durationMs / stepMs));
  let step = 0;

  window.clearInterval(Number(logoText.dataset.revealTimer ?? 0));
  logoText.textContent = LOGO_TEXT
    .split("")
    .map(() => sampleLogoRevealCharacter())
    .join("");

  const timer = window.setInterval(() => {
    step += 1;

    const revealedCount = Math.min(
      LOGO_TEXT.length,
      Math.ceil((step / totalSteps) * LOGO_TEXT.length),
    );

    logoText.textContent = LOGO_TEXT
      .split("")
      .map((character, index) =>
        index < revealedCount ? character : sampleLogoRevealCharacter(),
      )
      .join("");

    if (revealedCount >= LOGO_TEXT.length) {
      window.clearInterval(timer);
      logoText.textContent = LOGO_TEXT;
      delete logoText.dataset.revealTimer;
    }
  }, stepMs);

  logoText.dataset.revealTimer = String(timer);
};

const prepareLogoAnimation = (targets: LogoAnimationTargets): void => {
  const gsap = getGsapEngine();

  gsap.set([targets.logoAvatar, targets.logoAvatarRing], {
    opacity: 0,
    y: 14,
  });
  gsap.set(targets.logoPanel, {
    scaleX: 0,
    transformOrigin: "left center",
  });
  gsap.set(targets.logoAccent, {
    scaleY: 0,
    transformOrigin: "center bottom",
  });
  gsap.set(targets.logoSheen, {
    opacity: 0,
    y: -20,
  });
  gsap.set(targets.logoText, {
    opacity: 0,
    x: -10,
    y: 6,
  });
  targets.logoText.textContent = LOGO_TEXT;
};

const startLogoIdleMotion = (targets: LogoAnimationTargets): void => {
  const gsap = getGsapEngine();

  gsap.killTweensOf([targets.logoSvg, targets.logoSheen]);
  gsap.to(targets.logoSvg, {
    y: -3,
    duration: 2.4,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });
  gsap.fromTo(
    targets.logoSheen,
    {
      opacity: 0,
      y: -28,
    },
    {
      opacity: 0.26,
      y: 58,
      duration: 2.1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      repeatDelay: 0.45,
    },
  );
};

const runLogoEntryAnimation = (targets: LogoAnimationTargets): void => {
  const gsap = getGsapEngine();
  const timeline = gsap.timeline({
    delay: 0.04,
    onComplete: () => startLogoIdleMotion(targets),
  });

  timeline
    .to([targets.logoAvatar, targets.logoAvatarRing], {
      opacity: 1,
      y: 0,
      duration: 0.25,
      ease: "expo.out",
    })
    .to(
      targets.logoAccent,
      {
        scaleY: 1,
        duration: 0.24,
        ease: "expo.out",
      },
      0.02,
    )
    .to(
      targets.logoPanel,
      {
        scaleX: 1,
        duration: 0.3,
        ease: "expo.out",
      },
      0.08,
    )
    .to(
      targets.logoText,
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.28,
        ease: "expo.out",
        onStart: () => revealLogoText(targets.logoText),
      },
      0.34,
    );
};

const initHoverTweens = (): void => {
  if (!window.matchMedia(DESKTOP_QUERY).matches) {
    return;
  }

  document
    .querySelectorAll<HTMLElement>(".hello nav a, .primary-nav a")
    .forEach((link) => {
      link.addEventListener("mouseover", (event) => {
        event.preventDefault();
        getGsapEngine().to(link.querySelector(".text"), {
          autoAlpha: 0,
          scale: 1.5,
          duration: 0.25,
          ease: "expo.out",
        });
      });
      link.addEventListener("mouseout", (event) => {
        event.preventDefault();
        getGsapEngine().to(link.querySelector(".text"), {
          autoAlpha: 1,
          scale: 1,
          duration: 0.25,
          ease: "expo.out",
        });
      });
    });
};

const initNavigationClones = (analytics: NativeAnalytics): void => {
  document
    .querySelectorAll<HTMLElement>(".hello nav a, .primary-nav a")
    .forEach((link) => {
      link.addEventListener("click", () => {
        const routeName = link.dataset.name ?? "";
        const currentPage =
          getRouteLifecycle()?.getState().currentPage || "hello";

        if (routeName && routeName !== currentPage) {
          createElementClone(link);
        }

        if (link.closest(".primary-nav")) {
          closeMenu();
          analytics.clickEvent("Menu: Nav", routeName);
        } else {
          analytics.clickEvent("Hello: Nav", routeName);
        }
      });
    });

  document.querySelector(".header .logo a")?.addEventListener("click", () => {
    analytics.clickEvent("Logo", null);
  });
};

export const initNativeLoaderHeaderMenu = (
  analytics: NativeAnalytics,
): void => {
  const gsap = getGsapEngine();
  const logoTargets = getLogoAnimationTargets();

  if (logoTargets) {
    prepareLogoAnimation(logoTargets);
    runLogoEntryAnimation(logoTargets);
  }

  gsap.to(".loader", {
    opacity: 0,
    scale: 0.75,
    duration: 1,
    ease: "expo.out",
    onComplete: () => document.querySelector(".loader")?.remove(),
  });
  gsap.to(".logo", {
    opacity: 1,
    y: 0,
    duration: 0.22,
    ease: "expo.out",
    delay: 0,
  });
  gsap.to(".menu", {
    autoAlpha: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.75,
  });

  initHoverTweens();
  initNavigationClones(analytics);
  initMenu();
  initHeaderScroll();
};
