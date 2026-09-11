import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import Modal from "./Modal";

/** Mirrors the real call sites: form state in the page component + a new
 *  inline `onClose` on every render. Defined at module scope — a component
 *  must never be declared inside another component's body. */
function FormModal() {
  const [text, setText] = useState("");
  return (
    <Modal open={true} title="Form" onClose={() => {}}>
      <input aria-label="First name" value={text} onChange={(e) => setText(e.target.value)} />
    </Modal>
  );
}

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} title="Test" onClose={vi.fn()}>
        Body
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog when open", () => {
    render(
      <Modal open={true} title="Confirm" onClose={vi.fn()}>
        Body text
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <Modal open={true} title="Action" onClose={vi.fn()} footer={<button>OK</button>}>
        Content
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Closeable" onClose={onClose}>
        Content
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Escape" onClose={onClose}>
        Content
      </Modal>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when clicking the backdrop", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Backdrop" onClose={onClose}>
        Content
      </Modal>,
    );
    // Click on the backdrop (the fixed overlay)
    const backdrop = screen.getByRole("dialog").parentElement!;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Regression (2026-09-11): the open/focus effect used to depend on
  // `onClose`, which every call site passes as a fresh inline function. Each
  // keystroke in a form re-rendered the page → new `onClose` identity →
  // effect re-ran → `panelRef.current?.focus()` stole focus from the input
  // after every character. Focus must be applied on open only.
  it("keeps focus in a form input across parent re-renders (focus-loss regression)", async () => {
    const user = userEvent.setup();
    render(<FormModal />);

    const input = screen.getByLabelText("First name");
    await user.click(input);
    expect(document.activeElement).toBe(input);

    await user.type(input, "abc");

    // Same DOM node — no unmount/remount of the field.
    expect(screen.getByLabelText("First name")).toBe(input);
    expect((input as HTMLInputElement).value).toBe("abc");
    // Focus was not stolen by the modal's focus effect during re-renders.
    expect(document.activeElement).toBe(input);
  });
});
