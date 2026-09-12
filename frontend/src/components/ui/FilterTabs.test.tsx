import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test-utils";
import FilterTabs from "./FilterTabs";

const TABS = [
  { id: "all", label: "All", count: 4 },
  { id: "lost", label: "Lost" },
  { id: "found", label: "Found" },
];

describe("FilterTabs", () => {
  it("marks only the active tab as selected", () => {
    renderWithProviders(<FilterTabs tabs={TABS} value="lost" onChange={vi.fn()} ariaLabel="Report type" />);

    expect(screen.getByRole("tablist", { name: "Report type" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Lost/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^All/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /^Found/ })).toHaveAttribute("aria-selected", "false");
  });

  it("renders the optional count with its label", () => {
    renderWithProviders(<FilterTabs tabs={TABS} value="all" onChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /All\s*4/ })).toBeInTheDocument();
  });

  it("reports the clicked tab id", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<FilterTabs tabs={TABS} value="all" onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: /^Found/ }));

    expect(onChange).toHaveBeenCalledWith("found");
  });

  it("moves between tabs with the arrow keys", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<FilterTabs tabs={TABS} value="all" onChange={onChange} />);
    screen.getByRole("tab", { name: /^All/ }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("lost");
  });
});
