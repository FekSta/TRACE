import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Field, TextInput, Select, TextArea } from "./Field";

describe("Field", () => {
  it("renders the label", () => {
    render(
      <Field label="Email">
        <input />
      </Field>,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders error text when error is provided", () => {
    render(
      <Field label="Name" error="Required">
        <input />
      </Field>,
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("does not render error text when error is not provided", () => {
    render(
      <Field label="Name">
        <input />
      </Field>,
    );
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });
});

describe("TextInput", () => {
  it("renders an input element", () => {
    render(<TextInput placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });

  it("accepts typed text", async () => {
    const user = userEvent.setup();
    render(<TextInput />);
    const input = screen.getByRole("textbox");
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");
  });
});

describe("Select", () => {
  it("renders a select element", () => {
    render(
      <Select>
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("applies compact class when compact is true", () => {
    render(
      <Select compact>
        <option value="a">A</option>
      </Select>,
    );
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("w-auto");
  });
});

describe("TextArea", () => {
  it("renders a textarea", () => {
    render(<TextArea placeholder="Describe…" />);
    expect(screen.getByPlaceholderText("Describe…")).toBeInTheDocument();
  });

  it("accepts typed text", async () => {
    const user = userEvent.setup();
    render(<TextArea />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "multi\nline");
    expect(textarea).toHaveValue("multi\nline");
  });
});
