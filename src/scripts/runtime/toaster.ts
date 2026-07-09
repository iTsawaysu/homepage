import { getGsapEngine } from "../animation/gsap";

let toasterIndex = 0;

const getOrCreateWrap = (): HTMLElement => {
  const existing = document.querySelector<HTMLElement>(".toaster-wrap");

  if (existing) {
    return existing;
  }

  const wrap = document.createElement("div");
  wrap.className = "toaster-wrap";
  document.querySelector("#main")?.after(wrap);

  return wrap;
};

export const showNativeToaster = (
  message = "Toaster message",
  timeoutSeconds = 5,
  isReload = false,
): void => {
  const wrap = getOrCreateWrap();
  const index = toasterIndex;
  toasterIndex += 1;

  const toaster = document.createElement("div");
  toaster.className = `toaster toaster${index}`;
  toaster.innerHTML = `<p></p>${
    isReload ? '<button class="btn-refresh js-refresh">刷新</button>' : ""
  }<button class="js-dismiss"><span class="sr-only">关闭</span><i class="icon icon-cross"></i></button>`;
  toaster.querySelector("p")!.textContent = message;
  wrap.append(toaster);

  const gsap = getGsapEngine();
  gsap.to(toaster, {
    opacity: 1,
    scale: 1,
    duration: 0.75,
    ease: "expo.out",
  });

  const dismiss = () => {
    gsap.to(toaster, {
      opacity: 0,
      scale: 0.75,
      duration: 0.75,
      ease: "expo.out",
      onComplete: () => toaster.remove(),
    });
  };

  toaster.querySelector(".js-dismiss")?.addEventListener("click", (event) => {
    event.preventDefault();
    dismiss();
  });
  toaster.querySelector(".js-refresh")?.addEventListener("click", () => {
    window.location.reload();
  });

  if (timeoutSeconds !== 0) {
    window.setTimeout(dismiss, timeoutSeconds * 1000);
  }
};
