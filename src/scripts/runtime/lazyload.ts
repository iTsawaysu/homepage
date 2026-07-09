const loadLazyElement = (element: HTMLElement): void => {
  const original = element.getAttribute("data-original");

  if (!original) {
    return;
  }

  if (element instanceof HTMLImageElement) {
    element.src = original;
    return;
  }

  element.style.backgroundImage = `url(${original})`;
};

export const initNativeLazyload = (): void => {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(".lazy"));

  if (!("IntersectionObserver" in window)) {
    elements.forEach(loadLazyElement);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        if (entry.target instanceof HTMLElement) {
          loadLazyElement(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: "100px 0px 100px 0px",
      threshold: 0,
    },
  );

  elements.forEach((element) => observer.observe(element));
};
