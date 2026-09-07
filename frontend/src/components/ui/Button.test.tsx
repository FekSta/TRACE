import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies outline variant class by default", () => {
    render(<Button>Test</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-white");
  });

  it("applies primary variant class", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-brand");
  });

  it("applies danger variant class", () => {
    render(<Button variant="danger">Danger</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("border-danger");
  });

  it("applies ghost variant class", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-transparent");
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await screen.getByRole("button").click();
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("accepts custom className", () => {
    render(<Button className="extra-class">Test</Button>);
    expect(screen.getByRole("button").className).toContain("extra-class");
  });

  it("passes through HTML button attributes", () => {
    render(<Button type="submit" aria-label="Submit form">Go</Button>);
    const btn = screen.getByRole("button", { name: "Submit form" });
    expect(btn).toHaveAttribute("type", "submit");
  });
});
