import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));

import { HeaderNav } from "./header-nav";

describe("HeaderNav", () => {
  it("has a menu button that announces its state and controls the panel", async () => {
    render(<HeaderNav />);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(panel).toHaveAttribute("hidden");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");
  });

  it("closes on Escape and returns focus to the button", async () => {
    render(<HeaderNav />);
    const button = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("marks the current page", () => {
    render(<HeaderNav />);
    const current = screen.getAllByRole("link", { name: "Dashboard" });
    for (const link of current) expect(link).toHaveAttribute("aria-current", "page");
  });

  it("has no detectable accessibility violations, open or closed", async () => {
    const { container } = render(<HeaderNav />);
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
