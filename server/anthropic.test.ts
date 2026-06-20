import { describe, expect, it } from "vitest";
import { createGlossRunner } from "./anthropic.ts";
import { GlossInputError } from "../shared/gloss.ts";
import { READING_LIST } from "../shared/readingList.ts";

const shelfTitles = new Set(READING_LIST.map((b) => b.title));

describe("createGlossRunner (fake mode)", () => {
  const run = createGlossRunner({ fake: true });

  it("produces a summary from pasted text without a network call", async () => {
    const result = await run({ text: "Big rewrites fail; prefer small reversible steps." });
    expect(result.tldr).toContain("rewrites");
    expect(result.keyPoints.length).toBeGreaterThanOrEqual(1);
    expect(result.relatedReads.length).toBeLessThanOrEqual(2);
    for (const read of result.relatedReads) {
      expect(shelfTitles.has(read.title)).toBe(true);
    }
  });

  it("recovers the handle from a URL-only input", async () => {
    const result = await run({ url: "https://x.com/patio11/status/1" });
    expect(result.attribution.handle).toBe("@patio11");
  });

  it("rejects empty input before any network call", async () => {
    await expect(run({ text: "   ", url: "" })).rejects.toBeInstanceOf(GlossInputError);
  });
});
