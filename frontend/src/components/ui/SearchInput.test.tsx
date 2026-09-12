import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test-utils";
import SearchInput from "./SearchInput";

describe("SearchInput", () => {
  it("renders the accessible label and calls onChange while typing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <SearchInput value="" onChange={onChange} ariaLabel="Search reports" placeholder="Search reports…" />,
    );

    const field = screen.getByRole("textbox", { name: "Search reports" });
    expect(field).toHaveAttribute("placeholder", "Search reports…");

    await user.type(field, "wal");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toBe("l");
  });

  it("shows the clear button only when there is a value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = renderWithProviders(
      <SearchInput value="" onChange={onChange} ariaLabel="Search claims" />,
    );
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();

    rerender(<SearchInput value="wallet" onChange={onChange} ariaLabel="Search claims" />);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
