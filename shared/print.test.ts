import { describe, expect, it } from "vitest";
import { buildPrintHtml, formatAttribution } from "./print.ts";
import type { GlossResult } from "./types.ts";

const sample: GlossResult = {
  tldr: "A non-technical founder now ships software herself with AI coding tools.",
  keyPoints: [
    "Years of hiring developers to build her ideas are over.",
    "She builds directly with Claude Code and Codex.",
    "The founder-to-engineer translation gap has effectively closed.",
  ],
  attribution: { handle: "@cathrynlavery", date: "Jun 19, 2026", source: "https://x.com/c/a/1" },
  relatedReads: [
    {
      title: "The Mythical Man-Month",
      author: "Frederick P. Brooks Jr.",
      why: "the communication gap she's closing",
    },
  ],
};

describe("formatAttribution", () => {
  it("joins handle and date with a middot", () => {
    expect(formatAttribution(sample)).toBe("@cathrynlavery · Jun 19, 2026");
  });

  it("omits missing parts", () => {
    expect(
      formatAttribution({ ...sample, attribution: { handle: "@a", date: null, source: null } }),
    ).toBe("@a");
    expect(
      formatAttribution({ ...sample, attribution: { handle: null, date: null, source: null } }),
    ).toBe("");
  });
});

describe("buildPrintHtml", () => {
  it("produces a single-page standalone document led by the summary", () => {
    const html = buildPrintHtml(sample);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("size: letter");
    expect(html).toContain(sample.tldr);
    for (const point of sample.keyPoints) {
      expect(html).toContain(point);
    }
    expect(html).toContain("@cathrynlavery · Jun 19, 2026");
  });

  it("includes related reading when present, and omits the section when empty", () => {
    expect(buildPrintHtml(sample)).toContain("Related reading");
    const noReads = buildPrintHtml({ ...sample, relatedReads: [] });
    expect(noReads).not.toContain("Related reading");
  });

  it("escapes HTML in model-provided content", () => {
    const html = buildPrintHtml({ ...sample, tldr: "<script>alert('xss')</script>" });
    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
