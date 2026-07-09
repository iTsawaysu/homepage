import { initAchievementsViewportRefresh } from "./achievements-viewport-refresh";
import { installLegacyAnimationBridge } from "./animation/legacy-animation-bridge";
import { installLegacyTemplateAdapter } from "./legacy-template-adapter";
import { initProjectNoteReveal } from "./project-note";
import { initNativeRuntimeHost } from "./runtime/native-runtime";
import { installLegacyRuntimeBridge } from "./routing/legacy-runtime-bridge";
import { initHashRouter } from "./routing/router";
import { initWechatCards } from "./wechat-card";

export const initSiteBehaviors = () => {
  installLegacyRuntimeBridge();
  installLegacyAnimationBridge();
  installLegacyTemplateAdapter();
  initNativeRuntimeHost();
  initHashRouter();
  initProjectNoteReveal();
  initAchievementsViewportRefresh();
  initWechatCards();
};
