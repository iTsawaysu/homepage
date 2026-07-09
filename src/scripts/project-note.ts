const CODING_HASHES = new Set(["#/coding/", "#/coding"]);

const requestFrame =
  window.requestAnimationFrame ||
  ((callback: FrameRequestCallback) => window.setTimeout(callback, 16));

let retryTimer = 0;
let retryCount = 0;

const isCodingRoute = () => CODING_HASHES.has(window.location.hash);

const getProjectNote = () =>
  document.querySelector<HTMLElement>(".project-note--coding");

const isCodingSectionVisible = () => {
  const section = document.querySelector<HTMLElement>(".case-studies.coding");

  return Boolean(section && window.getComputedStyle(section).display !== "none");
};

const isProjectNoteReadyToReveal = () => {
  const note = getProjectNote();

  if (!note) {
    return false;
  }

  if (note.classList.contains("is-project-note-visible")) {
    return true;
  }

  const rect = note.getBoundingClientRect();

  return rect.top < window.innerHeight - 24 && rect.bottom > 0;
};

const setProjectNoteVisible = (isVisible: boolean) => {
  const note = getProjectNote();

  if (!note) {
    return;
  }

  note.classList.toggle("is-project-note-visible", isVisible);
  note.setAttribute("aria-hidden", isVisible ? "false" : "true");
};

const revealProjectNoteWhenReady = () => {
  window.clearTimeout(retryTimer);

  if (!isCodingRoute()) {
    setProjectNoteVisible(false);
    return;
  }

  if (isCodingSectionVisible() && isProjectNoteReadyToReveal()) {
    requestFrame(() => {
      setProjectNoteVisible(
        isCodingRoute() && isCodingSectionVisible() && isProjectNoteReadyToReveal(),
      );
    });
    return;
  }

  if (retryCount < 80) {
    retryCount += 1;
    retryTimer = window.setTimeout(revealProjectNoteWhenReady, 50);
  }
};

const syncProjectNote = () => {
  retryCount = 0;
  window.clearTimeout(retryTimer);

  if (!isCodingRoute()) {
    setProjectNoteVisible(false);
    return;
  }

  revealProjectNoteWhenReady();
};

export const initProjectNoteReveal = () => {
  document.addEventListener("DOMContentLoaded", syncProjectNote);
  window.addEventListener("load", syncProjectNote);
  window.addEventListener("hashchange", syncProjectNote);
  window.addEventListener("resize", syncProjectNote);
  window.addEventListener("scroll", syncProjectNote);
};
