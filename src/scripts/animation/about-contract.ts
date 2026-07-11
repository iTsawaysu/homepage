export const ABOUT_CONTRACT_SELECTORS = {
  section: ".about",
  title: ".about h1",
  titleText: ".about h1 .text",
  titleIcon: ".about h1 .icon",
  bar: ".about .bar",
  paragraphs: ".about .col-l p",
  heading: ".about h2",
  skillsBar: ".skills__bar",
  skillsLabel: ".skills__label",
  skillPercentNumber: ".skills__percent-number",
  rule: ".about hr",
  logosText: ".logos p",
  logosItem: ".about .logos li",
} as const;

export const ABOUT_BRANCH_CONTRACT = {
  mobileQuery: "(max-width: 767px)",
  nonMobileQuery: "(min-width: 768px)",
  mobileBranchUsesWatchers: true,
  nonMobileBranchRunsImmediately: true,
} as const;

export const ABOUT_ROUTE_ENTER_TIMINGS = {
  bar: {
    durationSeconds: 0.5,
    ease: "Expo.easeOut",
    targetWidth: "100%",
  },
  titleIcon: {
    durationSeconds: 0.5,
    ease: "Expo.easeOut",
  },
  paragraph: {
    durationSeconds: 0.5,
    delaySeconds: 0.1,
    ease: "Expo.easeOut",
    targetOpacity: 1,
    targetY: 0,
  },
  titleBaffle: {
    owner: "ts-owned" as const,
    key: "bAbout",
    revealDurationMs: 750,
    revealDelayMs: 750,
  },
  mobile: {
    h2: {
      durationSeconds: 0.5,
      delaySeconds: 0,
      ease: "Expo.easeOut",
    },
    skillsBarReveal: {
      durationSeconds: 0.5,
      staggerSeconds: 0.1,
      ease: "Expo.easeOut",
    },
    skillCountDelayStepMs: 250,
    skillBarWidth: {
      durationSeconds: 0.75,
      delayStepSeconds: 0.25,
      ease: "Expo.easeInOut",
    },
    skillLabel: {
      durationSeconds: 0.75,
      delayStepSeconds: 0.25,
      ease: "Expo.easeInOut",
    },
    rule: {
      durationSeconds: 0.5,
      delaySeconds: 0,
      ease: "Expo.easeOut",
    },
    logosText: {
      durationSeconds: 0.75,
      delaySeconds: 0.25,
      ease: "Expo.easeOut",
    },
    logosItem: {
      durationSeconds: 0.5,
      delaySeconds: 0.5,
      staggerSeconds: 0.1,
      ease: "Expo.easeOut",
    },
  },
  nonMobile: {
    h2: {
      durationSeconds: 0.5,
      delaySeconds: 0.2,
      ease: "Expo.easeOut",
    },
    skillsBarReveal: {
      durationSeconds: 0.5,
      delaySeconds: 0.3,
      staggerSeconds: 0.1,
      ease: "Expo.easeOut",
    },
    skillsLoopDelayMs: 200,
    skillCountDelayStepMs: 250,
    skillBarWidth: {
      durationSeconds: 0.75,
      delayStepSeconds: 0.1,
      ease: "Expo.easeInOut",
    },
    skillLabel: {
      durationSeconds: 0.5,
      delayStepSeconds: 0.1,
      ease: "Expo.easeInOut",
    },
    rule: {
      durationSeconds: 0.5,
      delaySeconds: 0.4,
      ease: "Expo.easeOut",
    },
    logosText: {
      durationSeconds: 0.5,
      delaySeconds: 0.5,
      ease: "Expo.easeOut",
    },
    logosItem: {
      durationSeconds: 0.5,
      delaySeconds: 0.6,
      staggerSeconds: 0.1,
      ease: "Expo.easeOut",
    },
  },
} as const;
