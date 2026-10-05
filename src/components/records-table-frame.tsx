"use client";

// Shows the responses table as a table while it fits its container, and as a
// stack of cards once it would need a horizontal scrollbar. The card styles
// live in globals.css under .records-frame[data-layout="cards"]. Without
// JavaScript no layout is set, so it stays a table that scrolls sideways.
import { useLayoutEffect, useRef, type ReactNode } from "react";

export function RecordsTableFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  // No dependency list: sorting and searching swap the rows in place, so every
  // render re-checks the fit.
  useLayoutEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    // Lay it out as a table, see whether it overflows, then settle. Both writes
    // happen before the browser paints, so the trial layout is never seen.
    const fit = () => {
      frame.dataset.layout = "table";
      const overflows = frame.scrollWidth > frame.clientWidth + 1;
      frame.dataset.layout = overflows ? "cards" : "table";
    };

    fit();
    if (typeof ResizeObserver === "undefined") return;
    // The frame changes with the window; the table changes when a list cell opens.
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    const table = frame.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  });

  return (
    <div ref={ref} className="records-frame">
      {children}
    </div>
  );
}
