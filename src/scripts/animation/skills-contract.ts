export const SKILLS_CONTRACT_SELECTORS = {
  container: ".about .skills",
  bar: ".about .skills__bar",
  label: ".skills__label",
  percentNumber: ".skills__percent-number",
  percentUnit: ".skills__percent-unit",
} as const;

export const LEGACY_SKILLS_COUNT_CONTRACT = {
  owner: "ts-owned" as const,
  countToOwner: "ts-owned" as const,
  from: 0,
  speedMs: 1500,
  decimals: 1,
  formatter: "GSAP numeric tween + value.toFixed(decimals)",
} as const;

export const LEGACY_SKILLS_LABEL_BAFFLE_CONTRACT = {
  owner: "legacy-reused" as const,
  revealDurationMs: 750,
  revealDelayMs: 750,
  expectedLegacyStateKey: "bSkillsLabel",
} as const;

export type SkillsContractOwner = "legacy" | "legacy-reused" | "ts-owned";

export type SkillPercentContract = {
  index: number;
  dataPercentRaw: string | null;
  dataPercent: number | null;
  dataPercentIsValid: boolean;
  labelText: string | null;
  percentNumberText: string | null;
  percentUnitText: string | null;
  expectedCountTo: typeof LEGACY_SKILLS_COUNT_CONTRACT;
};

export type SkillsContractState = {
  ready: boolean;
  selector: typeof SKILLS_CONTRACT_SELECTORS.bar;
  countTo: typeof LEGACY_SKILLS_COUNT_CONTRACT;
  labelBaffle: typeof LEGACY_SKILLS_LABEL_BAFFLE_CONTRACT;
  barWidthUnit: "%";
  skillCount: number;
  skills: SkillPercentContract[];
};

const getText = (element: Element | null): string | null => {
  const text = element?.textContent?.replace(/\s+/g, " ").trim();

  return text ? text : null;
};

const parsePercent = (raw: string | null): number | null => {
  if (raw === null) {
    return null;
  }

  const value = Number.parseFloat(raw);

  return Number.isFinite(value) ? value : null;
};

export const readSkillsContractFromDom = (): SkillsContractState => {
  if (typeof document === "undefined") {
    return {
      ready: false,
      selector: SKILLS_CONTRACT_SELECTORS.bar,
      countTo: LEGACY_SKILLS_COUNT_CONTRACT,
      labelBaffle: LEGACY_SKILLS_LABEL_BAFFLE_CONTRACT,
      barWidthUnit: "%",
      skillCount: 0,
      skills: [],
    };
  }

  const skills = Array.from(
    document.querySelectorAll<HTMLElement>(SKILLS_CONTRACT_SELECTORS.bar),
  ).map((bar, index) => {
    const dataPercentRaw = bar.getAttribute("data-percent");
    const dataPercent = parsePercent(dataPercentRaw);

    return {
      index,
      dataPercentRaw,
      dataPercent,
      dataPercentIsValid: dataPercent !== null,
      labelText: getText(bar.querySelector(SKILLS_CONTRACT_SELECTORS.label)),
      percentNumberText: getText(
        bar.querySelector(SKILLS_CONTRACT_SELECTORS.percentNumber),
      ),
      percentUnitText: getText(
        bar.querySelector(SKILLS_CONTRACT_SELECTORS.percentUnit),
      ),
      expectedCountTo: LEGACY_SKILLS_COUNT_CONTRACT,
    };
  });

  return {
    ready:
      skills.length > 0 &&
      skills.every(
        (skill) =>
          skill.dataPercentIsValid &&
          skill.labelText !== null &&
          skill.percentNumberText !== null,
      ),
    selector: SKILLS_CONTRACT_SELECTORS.bar,
    countTo: LEGACY_SKILLS_COUNT_CONTRACT,
    labelBaffle: LEGACY_SKILLS_LABEL_BAFFLE_CONTRACT,
    barWidthUnit: "%",
    skillCount: skills.length,
    skills,
  };
};
