import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));

import { HeaderNav } from "./header-nav";

describe("HeaderNav", () => {
  it("has a menu button that announces its state and controls the panel", async () => {
    render(<HeaderNav role="ANALYST" />);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(panel).toHaveAttribute("hidden");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");
  });

  it("closes on Escape and returns focus to the button", async () => {
    render(<HeaderNav role="ANALYST" />);
    const button = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("marks the current page", () => {
    render(<HeaderNav role="ANALYST" />);
    const current = screen.getAllByRole("link", { name: "Dashboard" });
    for (const link of current) expect(link).toHaveAttribute("aria-current", "page");
  });

  it("has no detectable accessibility violations, open or closed", async () => {
    const { container } = render(<HeaderNav role="ANALYST" />);
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the Users link to analysts only", () => {
    render(<HeaderNav role="ANALYST" />);
    expect(screen.getAllByRole("link", { name: "Users" }).length).toBeGreaterThan(0);
  });

  it("hides the Users link from end users", () => {
    render(<HeaderNav role="END_USER" />);
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  });
});
