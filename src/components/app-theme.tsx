// Wraps an application's own pages so the analyst's custom CSS applies to them
// and nowhere else. Used on the app page and the responses page; the edit and
// delete pages are the analyst's tools, not the branded application, so they
// stay unwrapped.
import type { ReactNode } from "react";
import { CSS_CLOSING_SEQUENCE } from "@/lib/schema/application-form";

// The class the analyst's CSS is scoped to. The form's hint names it too, so an
// analyst can target it directly.
export const APP_THEME_CLASS = "app-theme";

type Props = {
  css: string | null;
  children: ReactNode;
};

export function AppTheme({ css, children }: Props) {
  // The form already refuses "</", but that only covers CSS saved through the
  // form. Checking again here means CSS written any other way (a script, a
  // direct database edit) still cannot close the style tag.
  const safeCss = css && !css.includes(CSS_CLOSING_SEQUENCE) ? css : null;

  return (
    <div className={APP_THEME_CLASS}>
      {safeCss && (
        // @scope limits every rule inside it to elements within .app-theme, so
        // an analyst's `h1 { color: red }` cannot recolor the site header.
        // In a browser without @scope support the whole block is dropped,
        // which fails safe: unstyled, never styled globally.
        //
        // dangerouslySetInnerHTML is needed because React would otherwise
        // escape characters such as > and break selectors like `a > span`.
        // It is safe here only because "</" can never reach this point.
        <style dangerouslySetInnerHTML={{ __html: `@scope (.${APP_THEME_CLASS}) {\n${safeCss}\n}` }} />
      )}
      {children}
    </div>
  );
}
