import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Total Items" value={42} />);
    expect(screen.getByText("Total Items")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders meta when provided", () => {
    render(<StatCard label="Claims" value={5} meta="2 pending" />);
    expect(screen.getByText("2 pending")).toBeInTheDocument();
  });

  it("does not render meta when not provided", () => {
    render(<StatCard label="Lost" value={3} />);
    expect(screen.queryByText("pending")).not.toBeInTheDocument();
  });

  it("renders a React node as value", () => {
    render(<StatCard label="Score" value={<span>98%</span>} />);
    expect(screen.getByText("98%")).toBeInTheDocument();
  });
});
