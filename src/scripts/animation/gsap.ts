import { gsap } from "gsap";

type GsapEngine = typeof gsap;

export const getGsapEngine = (): GsapEngine => gsap;

