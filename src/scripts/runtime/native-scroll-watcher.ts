type ViewportCallback = () => void;

export type NativeScrollWatcher = {
  callbacks: {
    enterViewport: ViewportCallback[];
  };
  offsets: {
    top: number;
    bottom: number;
  };
  enterViewport(callback: ViewportCallback): NativeScrollWatcher;
  recalculateLocation(): NativeScrollWatcher;
  destroy(): void;
};

export type PersistentNativeScrollWatcher = NativeScrollWatcher & {
  replaceEnterViewport(
    callback: ViewportCallback,
  ): PersistentNativeScrollWatcher;
};

const getElements = (target: Element | HTMLCollection | NodeList | Element[]) => {
  if (target instanceof Element) {
    return [target];
  }

  return Array.from(target).filter((element): element is Element =>
    element instanceof Element,
  );
};

const isVisibleWithOffset = (element: Element, offsetPx: number): boolean => {
  if (element.getClientRects().length === 0) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return rect.top < window.innerHeight - offsetPx && rect.bottom > offsetPx;
};

export const createNativeScrollWatcher = (
  target: Element | HTMLCollection | NodeList | Element[],
  offsetPx = -100,
): PersistentNativeScrollWatcher => {
  const elements = getElements(target);
  let destroyed = false;
  let isInsideViewport = false;
  let observer: IntersectionObserver | null = null;

  const watcher: PersistentNativeScrollWatcher = {
    callbacks: {
      enterViewport: [],
    },
    offsets: {
      top: offsetPx,
      bottom: offsetPx,
    },
    enterViewport(callback) {
      watcher.callbacks.enterViewport.push(callback);
      window.setTimeout(() => {
        runIfVisible(callback);
      }, 0);
      return watcher;
    },
    replaceEnterViewport(callback) {
      watcher.callbacks.enterViewport.splice(
        0,
        watcher.callbacks.enterViewport.length,
        callback,
      );
      window.setTimeout(() => {
        if (watcher.callbacks.enterViewport[0] === callback) {
          runIfVisible(callback);
        }
      }, 0);
      return watcher;
    },
    recalculateLocation() {
      runIfVisible();
      return watcher;
    },
    destroy() {
      destroyed = true;
      observer?.disconnect();
      observer = null;
      window.removeEventListener("scroll", handleViewportCheck);
      window.removeEventListener("resize", handleViewportCheck);
    },
  };

  const fireEnterCallbacks = () => {
    if (destroyed) {
      return;
    }

    watcher.callbacks.enterViewport.forEach((callback) => callback());
  };

  const isAnyElementVisible = () =>
    elements.some((element) => isVisibleWithOffset(element, offsetPx));

  function runIfVisible(callbackForAlreadyVisible?: ViewportCallback) {
    if (destroyed || elements.length === 0) {
      return;
    }

    const visible = isAnyElementVisible();

    if (visible && !isInsideViewport) {
      isInsideViewport = true;
      fireEnterCallbacks();
      return;
    }

    if (!visible) {
      isInsideViewport = false;
      return;
    }

    callbackForAlreadyVisible?.();
  }

  function handleViewportCheck() {
    runIfVisible();
  }

  function handleIntersectionEntries(entries: IntersectionObserverEntry[]) {
    if (
      entries.some(
        (entry) =>
          entry.isIntersecting && isVisibleWithOffset(entry.target, offsetPx),
      )
    ) {
      runIfVisible();
    }
  }

  const supportsIntersectionObserver =
    typeof window.IntersectionObserver === "function";

  if (supportsIntersectionObserver) {
    observer = new IntersectionObserver(
      handleIntersectionEntries,
      {
        root: null,
        rootMargin: `${-offsetPx}px 0px ${-offsetPx}px 0px`,
        threshold: 0,
      },
    );
    elements.forEach((element) => observer?.observe(element));
  }

  window.addEventListener("scroll", handleViewportCheck);
  window.addEventListener("resize", handleViewportCheck);
  window.setTimeout(handleViewportCheck, 0);

  return watcher;
};
