import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusIndicator from "./StatusIndicator";

describe("StatusIndicator", () => {
  it.each([
    ["Pending", "circle", "text-muted"],
    ["Approved", "check_circle", "text-success-ink"],
    ["Verifying", "fiber_manual_record", "text-info"],
    ["Rejected", "block", "text-danger"],
  ] as const)("renders the %s state with its label and icon", (status, icon, iconClass) => {
    const { container } = render(<StatusIndicator status={status} />);

    // The label is mandatory — status must never be colour-only.
    expect(screen.getByText(status)).toBeInTheDocument();

    const iconEl = container.querySelector(`.${iconClass}`);
    expect(iconEl).not.toBeNull();
    expect(iconEl?.textContent).toBe(icon);
    expect(iconEl?.getAttribute("aria-hidden")).toBe("true");
  });

  it("accepts a label override while keeping the state styling", () => {
    const { container } = render(<StatusIndicator status="Verifying" label="Under review" />);
    expect(screen.getByText("Under review")).toBeInTheDocument();
    expect(container.querySelector(".text-info")).not.toBeNull();
  });
});
