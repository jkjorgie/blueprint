// Wraps an application's pages so the analyst's custom CSS applies there and nowhere else.
import type { ReactNode } from "react";
import { CSS_CLOSING_SEQUENCE } from "@/lib/schema/application-form";

export const APP_THEME_CLASS = "app-theme";

type Props = {
  css: string | null;
  children: ReactNode;
};

export function AppTheme({ css, children }: Props) {
  // The form refuses "</", but CSS could reach the database another way, so check again.
  const safeCss = css && !css.includes(CSS_CLOSING_SEQUENCE) ? css : null;

  return (
    <div className={APP_THEME_CLASS}>
      {safeCss && (
        // @scope limits every rule to elements inside .app-theme. Raw HTML is needed because
        // React would escape ">" in selectors; it is safe only because "</" cannot reach here.
        <style dangerouslySetInnerHTML={{ __html: `@scope (.${APP_THEME_CLASS}) {\n${safeCss}\n}` }} />
      )}
      {children}
    </div>
  );
}
