import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { AppTheme } from "./app-theme";

const css = "h1 { color: #1e4fcf; }\n.btn-primary { background: #0b7a4b; }";

const styleTag = (container: HTMLElement) => container.querySelector("style");

describe("AppTheme", () => {
  it("wraps its children in the app-theme class", () => {
    const { container } = render(
      <AppTheme css={null}>
        <h1>Bug Reports</h1>
      </AppTheme>,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("app-theme");
    expect(wrapper).toContainElement(screen.getByRole("heading", { name: "Bug Reports" }));
  });

  it("renders the CSS inside an @scope block limited to .app-theme", () => {
    const { container } = render(
      <AppTheme css={css}>
        <h1>Bug Reports</h1>
      </AppTheme>,
    );

    const style = styleTag(container);
    expect(style).not.toBeNull();
    expect(style?.textContent).toBe(`@scope (.app-theme) {\n${css}\n}`);
    expect(container.querySelector(".app-theme > style")).toBe(style);
  });

  it("keeps characters like > intact instead of HTML-escaping them", () => {
    const { container } = render(<AppTheme css="a > span { color: red; }">content</AppTheme>);

    expect(styleTag(container)?.textContent).toContain("a > span");
    expect(styleTag(container)?.innerHTML).not.toContain("&gt;");
  });

  it("renders no style tag when there is no CSS", () => {
    const { container } = render(<AppTheme css={null}>content</AppTheme>);
    expect(styleTag(container)).toBeNull();
  });

  it("renders no style tag for an empty string", () => {
    const { container } = render(<AppTheme css="">content</AppTheme>);
    expect(styleTag(container)).toBeNull();
  });

  it("refuses CSS containing </ even if it reached the database some other way", () => {
    const attack = "h1 { color: red } </style><script>alert(1)</script>";
    const { container } = render(<AppTheme css={attack}>content</AppTheme>);

    expect(styleTag(container)).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container).toHaveTextContent("content");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <AppTheme css={css}>
        <main>
          <h1>Bug Reports</h1>
          <button type="button" className="btn btn-primary">
            Submit
          </button>
        </main>
      </AppTheme>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
