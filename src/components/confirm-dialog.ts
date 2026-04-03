// src/components/confirm-dialog.ts

export interface DialogAction {
  label: string;
  variant: "primary" | "danger" | "ghost";
  onClick: () => void;
}

let _dialogSeq = 0;

export function showConfirmDialog(opts: {
  title: string;
  body: string;
  actions: DialogAction[];
  onDismiss?: () => void;
}): () => void {
  const overlay = document.createElement("div");
  overlay.className = "confirm-dialog-overlay";

  const titleId = `confirm-dialog-title-${++_dialogSeq}`;

  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", titleId);

  const titleEl = document.createElement("h3");
  titleEl.className = "confirm-dialog-title";
  titleEl.id = titleId;
  titleEl.textContent = opts.title;

  const bodyEl = document.createElement("p");
  bodyEl.className = "confirm-dialog-body";
  bodyEl.textContent = opts.body;

  const actionsEl = document.createElement("div");
  actionsEl.className = "confirm-dialog-actions";

  const previouslyFocused = document.activeElement as HTMLElement | null;

  function close(): void {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown);
    previouslyFocused?.focus();
  }

  function ghostAction(): (() => void) | undefined {
    return (
      opts.onDismiss ??
      [...opts.actions].reverse().find((a) => a.variant === "ghost")?.onClick
    );
  }

  function focusableButtons(): HTMLElement[] {
    return Array.from(
      dialog.querySelectorAll<HTMLElement>("button:not([disabled])"),
    );
  }

  for (const action of opts.actions) {
    const btn = document.createElement("button");
    btn.className = `btn confirm-dialog-btn confirm-dialog-btn-${action.variant}`;
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      close();
      action.onClick();
    });
    actionsEl.appendChild(btn);
  }

  function onKeyDown(e: KeyboardEvent): void {
    // Only handle for the topmost dialog
    const dialogs = document.querySelectorAll(".confirm-dialog-overlay");
    if (dialogs[dialogs.length - 1] !== overlay) return;

    if (e.key === "Escape") {
      const handler = ghostAction();
      close();
      handler?.();
      return;
    }

    if (e.key === "Tab") {
      const focusable = focusableButtons();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;
    const handler = ghostAction();
    close();
    handler?.();
  });

  document.addEventListener("keydown", onKeyDown);

  dialog.append(titleEl, bodyEl, actionsEl);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Auto-focus first button and trap focus within dialog
  focusableButtons()[0]?.focus();

  return close;
}
