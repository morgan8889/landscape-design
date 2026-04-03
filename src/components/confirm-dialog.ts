// src/components/confirm-dialog.ts

export interface DialogAction {
  label: string;
  variant: "primary" | "danger" | "ghost";
  onClick: () => void;
}

export function showConfirmDialog(opts: {
  title: string;
  body: string;
  actions: DialogAction[];
}): () => void {
  const overlay = document.createElement("div");
  overlay.className = "confirm-dialog-overlay";

  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";

  const titleEl = document.createElement("h3");
  titleEl.className = "confirm-dialog-title";
  titleEl.textContent = opts.title;

  const bodyEl = document.createElement("p");
  bodyEl.className = "confirm-dialog-body";
  bodyEl.textContent = opts.body;

  const actionsEl = document.createElement("div");
  actionsEl.className = "confirm-dialog-actions";

  function close(): void {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown);
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
    if (e.key !== "Escape") return;
    const ghost = [...opts.actions]
      .reverse()
      .find((a) => a.variant === "ghost");
    close();
    ghost?.onClick();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;
    const ghost = [...opts.actions]
      .reverse()
      .find((a) => a.variant === "ghost");
    close();
    ghost?.onClick();
  });

  document.addEventListener("keydown", onKeyDown);

  dialog.append(titleEl, bodyEl, actionsEl);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  return close;
}
