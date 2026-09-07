import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Loading from "./Loading";

describe("Loading", () => {
  it("renders the default label", () => {
    render(<Loading />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    render(<Loading label="Fetching data…" />);
    expect(screen.getByText("Fetching data…")).toBeInTheDocument();
  });
});
