import { describe, expect, it } from "vitest";
import { buildPrintHtml, formatAttribution } from "./print.ts";
import { fakeGloss } from "./fake.ts";
import type { GlossResult } from "./types.ts";

const sample: GlossResult = {
  idea: "Small reversible steps beat big rewrites.",
  attribution: { handle: "@patio11", date: "Jun 20, 2026", source: "https://x.com/p/status/1" },
  picks: [
    { title: "Refactoring", author: "Martin Fowler", why: "The case for small safe steps." },
    {
      title: "A Philosophy of Software Design",
      author: "John Ousterhout",
      why: "Complexity is the thing being managed.",
    },
  ],
};

describe("formatAttribution", () => {
  it("joins handle and date with a middot", () => {
    expect(formatAttribution(sample)).toBe("@patio11 · Jun 20, 2026");
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
  it("produces a full standalone document", () => {
    const html = buildPrintHtml(sample);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("size: letter");
    expect(html).toContain("Refactoring");
    expect(html).toContain("Martin Fowler");
    expect(html).toContain("@patio11 · Jun 20, 2026");
  });

  it("escapes HTML in model-provided content", () => {
    const danger = fakeGloss({ text: "<script>alert('x')</script> tweet about systems" });
    const html = buildPrintHtml({
      ...danger,
      idea: "<script>alert('xss')</script>",
    });
    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
