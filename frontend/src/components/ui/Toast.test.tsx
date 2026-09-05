import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToastProvider, useToast } from "./Toast";

/* Helper component that triggers a toast */
function ToastTrigger({ message, tone }: { message: string; tone?: "success" | "error" }) {
  const { show } = useToast();
  return (
    <button onClick={() => show(message, tone)}>
      Show toast
    </button>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("shows a toast when triggered", async () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Saved!" />
      </ToastProvider>,
    );
    await act(async () => {
      screen.getByRole("button", { name: "Show toast" }).click();
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Saved!");
    });
  });

  it("disappears after timeout", async () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Temporary" />
      </ToastProvider>,
    );
    await act(async () => {
      screen.getByRole("button", { name: "Show toast" }).click();
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("applies error tone class", async () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Oops" tone="error" />
      </ToastProvider>,
    );
    await act(async () => {
      screen.getByRole("button", { name: "Show toast" }).click();
    });
    const toast = await waitFor(() => screen.getByRole("status"));
    expect(toast.className).toContain("bg-danger");
  });
});
