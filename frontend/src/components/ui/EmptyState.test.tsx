import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders the default message", () => {
    render(<EmptyState />);
    expect(screen.getByText("No matching records found.")).toBeInTheDocument();
  });

  it("renders a custom message", () => {
    render(<EmptyState message="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders hint when provided", () => {
    render(<EmptyState hint={<span>Try adding one</span>} />);
    expect(screen.getByText("Try adding one")).toBeInTheDocument();
  });

  it("does not render hint when not provided", () => {
    render(<EmptyState />);
    expect(screen.queryByText("Try adding one")).not.toBeInTheDocument();
  });
});
