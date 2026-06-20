import { buildPrintHtml } from "../shared/print.ts";
import type { GlossResult } from "../shared/types.ts";

/**
 * Open the print sheet in a new tab as a clean, self-contained document, then
 * trigger the browser's print dialog. Returns false if the popup was blocked.
 */
export function openPrintSheet(result: GlossResult): boolean {
  // No "noopener" here: that makes window.open return null to the opener, and we
  // need the handle to write our own (trusted, self-built) document into it.
  const win = window.open("", "_blank");
  if (!win) return false;

  win.document.open();
  win.document.write(buildPrintHtml(result));
  win.document.close();

  // Let the new document lay out before asking to print.
  win.addEventListener("load", () => win.print(), { once: true });
  return true;
}
