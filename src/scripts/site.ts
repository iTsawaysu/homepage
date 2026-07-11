import { initAchievementsViewportRefresh } from "./achievements-viewport-refresh";
import { initProjectNoteReveal } from "./project-note";
import { initNativeRuntimeHost } from "./runtime/native-runtime";
import { initHashRouter } from "./routing/router";
import { initWechatCards } from "./wechat-card";

export const initSiteBehaviors = () => {
  // P3: pathjs/doT/animation-bridge/facade capture removed from production boot.
  // RouteLifecycle is installed inside initNativeRuntimeHost (methods wired +
  // window.__homepageRouteLifecycle published) before the ready event.
  initNativeRuntimeHost();
  initHashRouter();
  initProjectNoteReveal();
  initAchievementsViewportRefresh();
  initWechatCards();
};
