import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Card from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Inner content</Card>);
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });

  it("renders a title when provided", () => {
    render(<Card title="My Card">Content</Card>);
    expect(screen.getByText("My Card")).toBeInTheDocument();
  });

  it("does not render a header when no title or actions", () => {
    render(<Card>Content</Card>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders meta text next to title", () => {
    render(<Card title="List" meta="5 items">Content</Card>);
    expect(screen.getByText("5 items")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(<Card actions={<button>Action</button>}>Content</Card>);
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("applies noPadding class when noPadding is true", () => {
    const { container } = render(<Card noPadding>No pad</Card>);
    const inner = container.querySelector("div:last-child");
    expect(inner?.className).not.toContain("p-[18px]");
  });

  it("applies custom className", () => {
    const { container } = render(<Card className="my-class">Test</Card>);
    expect(container.firstElementChild?.className).toContain("my-class");
  });
});
