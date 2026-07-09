import { getGsapEngine } from "../animation/gsap";
import {
  createNativeScrollWatcher,
  type NativeScrollWatcher,
} from "./native-scroll-watcher";

export type AggregateScrollWatcher = NativeScrollWatcher & {
  watchers: NativeScrollWatcher[];
};

const query = (root: Element, selector: string): Element[] =>
  Array.from(root.querySelectorAll(selector));

const revealCaseStudySection = (section: Element): void => {
  const gsap = getGsapEngine();

  gsap.to(query(section, "h2"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
  });
  gsap.to(query(section, ".col"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    stagger: 0.1,
  });
  gsap.to(query(section, "h3"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.1,
    stagger: 0.1,
  });
  gsap.to(query(section, "hr"), {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    delay: 0.2,
  });
  gsap.to(query(section, ".pattern"), {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    delay: 0.3,
  });
  gsap.to(query(section, "p"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.4,
    stagger: 0.1,
  });
  gsap.to(query(section, "li"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.5,
    stagger: 0.1,
  });
  gsap.to(query(section, ".cta"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.6,
  });
};

const revealArticleSection = (section: Element): void => {
  const gsap = getGsapEngine();

  gsap.to(query(section, "h2"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
  });
  gsap.to(query(section, ".col"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    stagger: 0.1,
  });
  gsap.to(query(section, "h3"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.1,
    stagger: 0.1,
  });
  gsap.to(query(section, "hr"), {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    delay: 0.2,
  });
  gsap.to(query(section, ".pattern"), {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    delay: 0.3,
  });
  gsap.to(query(section, "p"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.4,
    stagger: 0.1,
  });
  gsap.to(query(section, "code"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.5,
    stagger: 0.1,
  });
  gsap.to(query(section, "li"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.5,
    stagger: 0.1,
  });
  gsap.to(query(section, "img"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.6,
    stagger: 0.1,
  });
  gsap.to(query(section, ".cta"), {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.6,
  });
};

const createAggregateWatcher = (
  sections: Element[],
  reveal: (section: Element) => void,
): AggregateScrollWatcher => {
  const watchers = sections.map((section) => {
    const watcher = createNativeScrollWatcher(section, -100);
    watcher.enterViewport(() => reveal(section));
    return watcher;
  });

  return {
    callbacks: {
      enterViewport: [],
    },
    offsets: {
      top: -100,
      bottom: -100,
    },
    watchers,
    enterViewport(callback) {
      watchers.forEach((watcher) => watcher.enterViewport(callback));
      return this;
    },
    recalculateLocation() {
      watchers.forEach((watcher) => watcher.recalculateLocation());
      return this;
    },
    destroy() {
      watchers.forEach((watcher) => watcher.destroy());
      watchers.length = 0;
    },
  };
};

export const createCaseStudyDetailWatcher = (): AggregateScrollWatcher =>
  createAggregateWatcher(
    Array.from(document.querySelectorAll(".case-study__section")),
    revealCaseStudySection,
  );

export const createArticleDetailWatcher = (): AggregateScrollWatcher =>
  createAggregateWatcher(
    Array.from(document.querySelectorAll(".article__section")),
    revealArticleSection,
  );
