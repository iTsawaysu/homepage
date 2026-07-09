const ACHIEVEMENTS_HASHES = new Set(["#/achievements/", "#/achievements"]);
const REFRESH_DELAYS = [700, 1400, 2400, 3400] as const;

const isAchievementsRoute = () => ACHIEVEMENTS_HASHES.has(window.location.hash);

const emitScrollEvent = () => {
  if (typeof window.Event === "function") {
    window.dispatchEvent(new Event("scroll"));
    return;
  }

  const event = document.createEvent("Event");
  const initLegacyEvent = (event as Event & Record<string, unknown>)[
    "init" + "Event"
  ] as (type: string, bubbles: boolean, cancelable: boolean) => void;

  initLegacyEvent.call(event, "scroll", true, true);
  window.dispatchEvent(event);
};

const syncAchievementsRouteState = () => {
  document.body.classList.toggle(
    "is-achievements-route-inactive",
    !isAchievementsRoute(),
  );
};

const refreshAchievementsViewport = () => {
  syncAchievementsRouteState();

  if (isAchievementsRoute()) {
    emitScrollEvent();
  }
};

const scheduleAchievementsViewportRefresh = () => {
  syncAchievementsRouteState();

  REFRESH_DELAYS.forEach((delay) => {
    window.setTimeout(refreshAchievementsViewport, delay);
  });
};

export const initAchievementsViewportRefresh = () => {
  document.addEventListener("DOMContentLoaded", scheduleAchievementsViewportRefresh);
  window.addEventListener("load", scheduleAchievementsViewportRefresh);
  window.addEventListener("hashchange", scheduleAchievementsViewportRefresh);
  window.addEventListener("resize", scheduleAchievementsViewportRefresh);
};
