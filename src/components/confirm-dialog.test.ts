// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { showConfirmDialog } from "./confirm-dialog";

afterEach(() => {
  document.body.replaceChildren();
});

describe("showConfirmDialog", () => {
  it("renders title and body", () => {
    showConfirmDialog({
      title: "Are you sure?",
      body: "This cannot be undone.",
      actions: [
        { label: "Confirm", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: vi.fn() },
      ],
    });
    expect(document.querySelector(".confirm-dialog-title")?.textContent).toBe(
      "Are you sure?",
    );
    expect(document.querySelector(".confirm-dialog-body")?.textContent).toBe(
      "This cannot be undone.",
    );
  });

  it("renders one button per action", () => {
    showConfirmDialog({
      title: "Delete?",
      body: "Gone forever.",
      actions: [
        { label: "Delete", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: vi.fn() },
      ],
    });
    const buttons = document.querySelectorAll(".confirm-dialog-btn");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("Delete");
    expect(buttons[1].textContent).toBe("Cancel");
  });

  it("fires action callback and removes dialog when button clicked", () => {
    const onClick = vi.fn();
    showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [
        { label: "OK", variant: "primary", onClick },
        { label: "Cancel", variant: "ghost", onClick: vi.fn() },
      ],
    });
    (
      document.querySelector(".confirm-dialog-btn") as HTMLButtonElement
    ).click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
  });

  it("fires ghost action and closes on Escape key", () => {
    const onCancel = vi.fn();
    showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [
        { label: "OK", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: onCancel },
      ],
    });
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
  });

  it("fires ghost action and closes on backdrop click", () => {
    const onCancel = vi.fn();
    showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [
        { label: "OK", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: onCancel },
      ],
    });
    const overlay = document.querySelector(
      ".confirm-dialog-overlay",
    ) as HTMLElement;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: false }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
  });

  it("returned cleanup function removes dialog without firing callbacks", () => {
    const onClick = vi.fn();
    const close = showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [{ label: "OK", variant: "primary", onClick }],
    });
    expect(document.querySelector(".confirm-dialog-overlay")).not.toBeNull();
    close();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("Escape only closes the topmost dialog when stacked", () => {
    const onCancel1 = vi.fn();
    const onCancel2 = vi.fn();
    showConfirmDialog({
      title: "First",
      body: "Background dialog",
      actions: [
        { label: "OK", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: onCancel1 },
      ],
    });
    showConfirmDialog({
      title: "Second",
      body: "Foreground dialog",
      actions: [
        { label: "OK", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: onCancel2 },
      ],
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    // Only the second (topmost) dialog should close
    expect(onCancel2).toHaveBeenCalledOnce();
    expect(onCancel1).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".confirm-dialog-overlay")).toHaveLength(
      1,
    );
  });
});
