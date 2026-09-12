import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test-utils";
import TableFooter from "./TableFooter";

describe("TableFooter", () => {
  it("shows the visible range and changes pages", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<TableFooter page={1} pageSize={2} total={5} onPageChange={onPageChange} />);

    expect(screen.getByText("Showing 1 to 2 of 5 items")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("handles an empty table without a negative range", () => {
    renderWithProviders(<TableFooter page={1} pageSize={10} total={0} onPageChange={vi.fn()} />);
    expect(screen.getByText("Showing 0 to 0 of 0 items")).toBeInTheDocument();
  });
});