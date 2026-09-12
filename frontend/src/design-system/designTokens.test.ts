import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Design system conformance.
 *
 * Reads `src/index.css` and asserts it declares every value from
 * `design/DESIGN.md` (TRACE Design System v1.0), and that none of the retired
 * officer-green identity survives. This is what makes the retrofit's
 * definition of done machine-checkable rather than asserted.
 */
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function declares(token: string, value: string) {
  return new RegExp(`${escapeRegExp(token)}:\\s*${escapeRegExp(value)}(\\s*;|\\s*$)`, "m").test(css);
}

/** 01 — Colour (DESIGN.md "Design Tokens — Quick Reference") */
const COLORS: Array<[string, string]> = [
  ["--color-ink", "#111827"],
  ["--color-amber", "#d97706"],
  ["--color-muted", "#6b7280"],
  ["--color-line", "#d1d5db"],
  ["--color-canvas", "#f8fafc"],
  ["--color-surface", "#ffffff"],
  ["--color-success", "#22c55e"],
  ["--color-danger", "#dc2626"],
  ["--color-warning", "#a67c00"],
  ["--color-warning-soft", "#fff8e1"],
  ["--color-navy", "#0b1c30"],
  ["--color-navy-soft", "#f8f9ff"],
  ["--color-nav-hover", "#dce9ff"],
  ["--color-auth-panel", "#0f172a"],
];

/** 03 — Type scale: size + line-height (+ weight where DESIGN.md states one) */
const TYPE_SCALE: Array<[string, string]> = [
  ["--text-h1", "32px"],
  ["--text-h1--line-height", "40px"],
  ["--text-h1--font-weight", "700"],
  ["--text-h2", "24px"],
  ["--text-h2--line-height", "32px"],
  ["--text-h2--font-weight", "700"],
  ["--text-h3", "18px"],
  ["--text-h3--line-height", "26px"],
  ["--text-h3--font-weight", "600"],
  ["--text-body-lg", "16px"],
  ["--text-body-lg--line-height", "24px"],
  ["--text-body", "14px"],
  ["--text-body--line-height", "20px"],
  ["--text-small", "12px"],
  ["--text-small--line-height", "16px"],
];

/** 05 — Radius & shadows */
const SHAPE: Array<[string, string]> = [
  ["--radius-sm", "8px"],
  ["--radius-input", "10px"],
  ["--radius-md", "12px"],
  ["--radius-card", "14px"],
  ["--radius-auth", "20px"],
  ["--shadow-card", "0 8px 30px rgba(0, 0, 0, 0.08)"],
  ["--shadow-hover", "0 16px 40px rgba(0, 0, 0, 0.12)"],
];

/** Values deliberately derived (DESIGN.md names the role, not the colour) */
const DERIVED: Array<[string, string]> = [
  ["--color-info", "#1d4ed8"],
  ["--color-info-soft", "#eff6ff"],
  ["--color-soft", "#f1f5f9"],
  ["--color-success-ink", "#15803d"],
];

describe("design tokens — index.css declares every DESIGN.md value", () => {
  it.each([...COLORS, ...DERIVED, ...TYPE_SCALE, ...SHAPE])("%s = %s", (token, value) => {
    expect(declares(token, value)).toBe(true);
  });

  // 02 — Typography: each family leads its stack (fallbacks follow).
  it("declares the Manrope heading stack and the Inter body stack", () => {
    expect(css).toMatch(/--font-display:\s*"Manrope"/);
    expect(css).toMatch(/--font-sans:\s*"Inter"/);
  });
});

describe("design tokens — retired identity is gone", () => {
  const RETIRED = [
    "--color-brand",
    "--color-brand-dark",
    "--color-brand-light",
    "--color-auth-ink",
    "--color-auth-navy",
    "--color-auth-amber",
    "#008542",
    "#006d35",
    "#e8f5ed",
    "#f6f8fb", // retired canvas value
    "#dbe1e7", // retired border value
    "#ba1a1a", // retired danger value
    "#667085", // retired muted value
  ];

  it.each(RETIRED)("no longer declares %s", (value) => {
    expect(css).not.toContain(value);
  });

  it("keeps the officer-derived warning literal out of the palette", () => {
    // #d97706 is now the amber accent, not the warning text colour
    expect(css).toMatch(/--color-warning:\s*#a67c00/);
  });
});

describe("design tokens — colour lives only in the token block", () => {
  it("declares every hex value on a --color-* line", () => {
    const hexLines = css.split("\n").filter((line) => /#[0-9a-fA-F]{3,8}/.test(line));
    expect(hexLines.length).toBeGreaterThan(0);
    const offenders = hexLines.filter(
      (line) => !/^\s*--color-[a-z-]+:\s*#[0-9a-fA-F]{3,8};/.test(line) && !/^\s*(\/\*|\*)/.test(line),
    );
    expect(offenders).toEqual([]);
  });
});
