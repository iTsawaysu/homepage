import { gsap } from "gsap";

export type GsapEngine = typeof gsap;

export const getGsapEngine = (): GsapEngine => gsap;

export const getGsapVersion = (): string => gsap.version;
