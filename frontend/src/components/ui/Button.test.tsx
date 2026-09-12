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
    expect(btn.className).toContain("bg-surface");
  });

  it("applies primary variant class (ink fill)", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-ink");
  });

  it("applies textLink variant class (amber, no container)", () => {
    render(<Button variant="textLink">Forgot Password?</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-amber");
    expect(btn.className).toContain("bg-transparent");
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

  describe("design system 07 sizing", () => {
    it.each(["primary", "outline", "danger"] as const)("%s is 44px tall with a 10px radius", (variant) => {
      render(<Button variant={variant}>Sized</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("h-11");
      expect(btn.className).toContain("rounded-input");
    });

    it("uses Inter semibold at 14px", () => {
      render(<Button variant="primary">Type</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("text-sm");
      expect(btn.className).toContain("font-semibold");
    });

    it("gives the textLink variant a 44px click target without a container", () => {
      render(<Button variant="textLink">Link</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("min-h-11");
    });

    it("reduces contrast on the disabled state", () => {
      render(<Button variant="primary" disabled>Off</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("disabled:opacity-50");
    });
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
