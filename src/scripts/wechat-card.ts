interface WechatItemElement extends HTMLElement {
  wechatCopyTimer?: number;
}

type CopyResultLabel = "已复制" | "手动复制";

const getWechatItems = () =>
  document.querySelectorAll<WechatItemElement>(".wechat-item.is-open");

const getWechatButton = (item: Element) =>
  item.querySelector<HTMLButtonElement>(".js-wechat-toggle");

const getCopyButton = (item: Element) =>
  item.querySelector<HTMLButtonElement>(".js-wechat-copy");

const getCopyStatus = (item: Element) =>
  item.querySelector<HTMLElement>(".js-wechat-copy-status");

const resetCopyButton = (item?: Element | null) => {
  if (!item) {
    return;
  }

  const wechatItem = item as WechatItemElement;
  const button = getCopyButton(item);
  const status = getCopyStatus(item);

  window.clearTimeout(wechatItem.wechatCopyTimer);

  if (button) {
    button.textContent = "复制";
  }

  if (status) {
    status.textContent = "";
  }
};

const closeWechatCards = (exceptItem?: Element | null) => {
  const items = getWechatItems();

  Array.prototype.forEach.call(items, (item: WechatItemElement) => {
    if (item === exceptItem) {
      return;
    }

    item.classList.remove("is-open");
    resetCopyButton(item);

    const button = getWechatButton(item);

    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  });
};

const copyText = (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise<void>((resolve, reject) => {
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const execCommand = (document as Document & Record<string, unknown>)[
        "exec" + "Command"
      ] as (commandId: string) => boolean;

      if (execCommand.call(document, "copy")) {
        resolve();
      } else {
        reject(new Error("copy command failed"));
      }
    } catch (error) {
      reject(error);
    } finally {
      document.body.removeChild(textarea);
    }
  });
};

const setCopyButtonState = (
  item: Element | null,
  label: CopyResultLabel,
  statusText: string,
) => {
  if (!item) {
    return;
  }

  const wechatItem = item as WechatItemElement;
  const button = getCopyButton(item);
  const status = getCopyStatus(item);

  if (button) {
    button.textContent = label;
  }

  if (status) {
    status.textContent = statusText;
  }

  window.clearTimeout(wechatItem.wechatCopyTimer);
  wechatItem.wechatCopyTimer = window.setTimeout(() => {
    resetCopyButton(wechatItem);
  }, 1800);
};

const copyWechatId = (button: Element) => {
  const text = button.getAttribute("data-copy-text") as string;
  const item = button.closest(".wechat-item");

  copyText(text)
    .then(() => {
      setCopyButtonState(item, "已复制", "微信号已复制");
    })
    .catch(() => {
      setCopyButtonState(item, "手动复制", "复制失败，请手动复制微信号");
    });
};

const handleClick = (event: MouseEvent) => {
  const target = event.target as Element;
  const copyButton = target.closest(".js-wechat-copy");

  if (copyButton) {
    event.preventDefault();

    copyWechatId(copyButton);
    return;
  }

  const button = target.closest(".js-wechat-toggle");

  if (button) {
    event.preventDefault();

    const item = button.closest(".wechat-item");

    if (!item) {
      return;
    }

    const shouldOpen = !item.classList.contains("is-open");

    closeWechatCards(item);
    resetCopyButton(item);
    item.classList.toggle("is-open", shouldOpen);
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    return;
  }

  if (!target.closest(".wechat-item")) {
    closeWechatCards();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    closeWechatCards();
  }
};

export const initWechatCards = () => {
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
};
