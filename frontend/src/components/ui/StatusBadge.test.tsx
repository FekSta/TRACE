import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBadge from "./StatusBadge";

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

  it("renders an unknown status with fallback styling", () => {
    render(<StatusBadge status="WeirdStatus" />);
    const el = screen.getByText("WeirdStatus");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("bg-soft");
  });

  it("renders Claimed status", () => {
    render(<StatusBadge status="Claimed" />);
    expect(screen.getByText("Claimed")).toBeInTheDocument();
  });

  it("renders Archived status", () => {
    render(<StatusBadge status="Archived" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});
