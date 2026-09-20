"use client";

// Header navigation for signed-in users. Inline links from the `sm` breakpoint
// up; below that a menu button that toggles a panel. The button announces its
// state, Escape closes the panel and returns focus, and the panel closes on
// navigation so it never lingers over a new page.

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
];

export function HeaderNav() {
  const pathname = usePathname();
  // The panel is "open for" one path. Navigating changes the path, so the
  // panel closes on its own without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (value: boolean) => setOpenFor(value ? pathname : null);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFor(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav aria-label="Main" className="flex items-center">
      <ul className="hidden items-center gap-4 sm:flex">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="nav-link" aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-secondary">
              Sign out
            </button>
          </form>
        </li>
      </ul>

      <button
        ref={buttonRef}
        type="button"
        className="btn btn-secondary sm:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          {open ? (
            <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
        Menu
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-14 z-40 border-b border-line bg-surface shadow-sm sm:hidden"
      >
        <ul className="container-page flex flex-col gap-1 py-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-md px-3 py-2 font-medium text-ink hover:bg-surface-muted"
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="mt-2 border-t border-line pt-3">
            <form action={signOutAction}>
              <button type="submit" className="btn btn-secondary w-full">
                Sign out
              </button>
            </form>
          </li>
        </ul>
      </div>
    </nav>
  );
}
