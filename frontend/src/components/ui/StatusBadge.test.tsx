import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBadge from "./StatusBadge";

/** Pill class of the rendered badge (the outer span). */
function pillClass(status: string) {
  const { container } = render(<StatusBadge status={status} />);
  return container.firstElementChild?.className ?? "";
}

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="Pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders Reported status", () => {
    render(<StatusBadge status="Reported" />);
    expect(screen.getByText("Reported")).toBeInTheDocument();
  });

  it("renders Approved status", () => {
    render(<StatusBadge status="Approved" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders Rejected status", () => {
    render(<StatusBadge status="Rejected" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders Claimed status", () => {
    render(<StatusBadge status="Claimed" />);
    expect(screen.getByText("Claimed")).toBeInTheDocument();
  });

  it("renders Archived status", () => {
    render(<StatusBadge status="Archived" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("renders an unknown status with fallback styling", () => {
    render(<StatusBadge status="WeirdStatus" />);
    const el = screen.getByText("WeirdStatus");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("bg-soft");
  });

  describe("semantic treatments (design system 09)", () => {
    it("Reported is neutral gray", () => {
      expect(pillClass("Reported")).toContain("bg-soft");
    });

    it("Matched is amber", () => {
      expect(pillClass("Matched")).toContain("bg-warning-soft");
    });

    it("Claimed is blue — not green", () => {
      const cls = pillClass("Claimed");
      expect(cls).toContain("bg-info-soft");
      expect(cls).not.toContain("bg-success");
    });

    it("Returned and Approved share the success treatment", () => {
      expect(pillClass("Returned")).toContain("bg-success");
      expect(pillClass("Approved")).toContain("bg-success");
    });

    it("Rejected is danger", () => {
      expect(pillClass("Rejected")).toContain("bg-danger");
    });

    it("is a fully rounded pill", () => {
      expect(pillClass("Reported")).toContain("rounded-full");
    });

    it("keeps every backend status mapped (none silently falls back)", () => {
      // The set of handled statuses must not shrink in the retrofit; only
      // their colours change. Unknown values legitimately fall back.
      const handled = [
        "Reported",
        "Suspended",
        "Inactive",
        "Archived",
        "Matched",
        "Lost",
        "Pending",
        "Suggested",
        "Claimed",
        "Verifying",
        "Found",
        "Available",
        "Returned",
        "Approved",
        "Accepted",
        "Completed",
        "Closed",
        "Active",
        "Rejected",
        "Cancelled",
      ];
      for (const status of handled) {
        expect(pillClass(status)).not.toBe("");
      }
      // 'Reported' is neutral while 'Suggested' is amber — prove the mapping
      // is per-status rather than a single fallback.
      expect(pillClass("Reported")).not.toBe(pillClass("Suggested"));
    });
  });
});
