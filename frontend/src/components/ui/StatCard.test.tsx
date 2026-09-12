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

  it("renders an icon tile when an icon is given", () => {
    const { container } = render(<StatCard label="Lost Items" value={3} icon="inventory_2" />);
    expect(container.querySelector(".material-symbols-outlined")?.textContent).toBe("inventory_2");
  });
});
