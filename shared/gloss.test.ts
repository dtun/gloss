import { describe, expect, it } from "vitest";
import {
  GlossInputError,
  GlossParseError,
  buildSystemPrompt,
  buildUserPrompt,
  extractJsonObject,
  handleFromUrl,
  normalizeInput,
  parseGlossResponse,
} from "./gloss.ts";
import { READING_LIST } from "./readingList.ts";

describe("normalizeInput", () => {
  it("trims and keeps text and url", () => {
    expect(normalizeInput({ text: "  hello  ", url: " https://x.com/a/status/1 " })).toEqual({
      text: "hello",
      url: "https://x.com/a/status/1",
    });
  });

  it("drops empty strings to undefined", () => {
    expect(normalizeInput({ text: "hi", url: "   " })).toEqual({ text: "hi", url: undefined });
  });

  it("throws when both are empty", () => {
    expect(() => normalizeInput({ text: "  ", url: "" })).toThrow(GlossInputError);
  });
});

describe("handleFromUrl", () => {
  it("extracts a handle from an x.com status URL", () => {
    expect(handleFromUrl("https://x.com/patio11/status/123")).toBe("@patio11");
  });

  it("extracts from twitter.com too", () => {
    expect(handleFromUrl("https://twitter.com/foo/status/9")).toBe("@foo");
  });

  it("ignores reserved paths and non-tweet URLs", () => {
    expect(handleFromUrl("https://x.com/home")).toBeNull();
    expect(handleFromUrl("https://example.com/blog")).toBeNull();
    expect(handleFromUrl(undefined)).toBeNull();
  });
});

describe("buildSystemPrompt", () => {
  it("lists every book on the shelf exactly once", () => {
    const prompt = buildSystemPrompt(READING_LIST);
    for (const book of READING_LIST) {
      expect(prompt).toContain(`"${book.title}" by ${book.author}`);
    }
  });
});

describe("buildUserPrompt", () => {
  it("includes pasted text when present", () => {
    expect(buildUserPrompt({ text: "a tweet" })).toContain("a tweet");
  });

  it("asks for web search when only a URL is given", () => {
    const prompt = buildUserPrompt({ url: "https://x.com/a/status/1" });
    expect(prompt).toContain("web_search");
  });

  it("does not ask for web search when text is present", () => {
    const prompt = buildUserPrompt({ text: "t", url: "https://x.com/a/status/1" });
    expect(prompt).not.toContain("web_search");
  });
});

describe("extractJsonObject", () => {
  it("pulls a bare object", () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it("pulls an object out of surrounding prose and fences", () => {
    const text = 'Sure!\n```json\n{"a": {"b": 2}}\n```\nDone.';
    expect(extractJsonObject(text)).toBe('{"a": {"b": 2}}');
  });

  it("handles braces inside strings", () => {
    expect(extractJsonObject('{"why": "use { and } carefully"}')).toBe(
      '{"why": "use { and } carefully"}',
    );
  });

  it("throws when there is no object", () => {
    expect(() => extractJsonObject("no json here")).toThrow(GlossParseError);
  });
});

describe("parseGlossResponse", () => {
  const valid = JSON.stringify({
    idea: "Small, reversible steps beat big rewrites.",
    attribution: { handle: "@patio11", date: "2026-06-20", source: "https://x.com/p/status/1" },
    picks: [
      { title: "Refactoring", why: "It is the canonical case for small safe steps." },
      { title: "Working Effectively with Legacy Code", why: "Seams let you change scary code." },
      { title: "A Philosophy of Software Design", why: "Complexity is the thing being managed." },
    ],
  });

  it("parses and reconciles a good response", () => {
    const result = parseGlossResponse(valid, READING_LIST);
    expect(result.idea).toContain("reversible");
    expect(result.picks).toHaveLength(3);
    // Author is filled from the shelf, not the model.
    expect(result.picks[0]).toEqual({
      title: "Refactoring",
      author: "Martin Fowler",
      why: "It is the canonical case for small safe steps.",
    });
    expect(result.attribution.handle).toBe("@patio11");
  });

  it("drops picks that are not on the shelf", () => {
    const text = JSON.stringify({
      idea: "x",
      attribution: { handle: null, date: null, source: null },
      picks: [
        { title: "A Made Up Book", why: "nope" },
        { title: "Accelerate", why: "delivery metrics that matter" },
      ],
    });
    const result = parseGlossResponse(text, READING_LIST);
    expect(result.picks).toHaveLength(1);
    expect(result.picks[0].title).toBe("Accelerate");
  });

  it("dedupes repeated picks and caps at four", () => {
    const text = JSON.stringify({
      idea: "x",
      picks: [
        { title: "Refactoring", why: "a" },
        { title: "Refactoring", why: "b" },
        { title: "Accelerate", why: "c" },
        { title: "Staff Engineer", why: "d" },
        { title: "Thinking in Systems", why: "e" },
        { title: "Team Topologies", why: "f" },
      ],
    });
    const result = parseGlossResponse(text, READING_LIST);
    expect(result.picks).toHaveLength(4);
    expect(result.picks.filter((p) => p.title === "Refactoring")).toHaveLength(1);
  });

  it("defaults missing attribution to nulls", () => {
    const text = JSON.stringify({ idea: "x", picks: [{ title: "Accelerate", why: "y" }] });
    const result = parseGlossResponse(text, READING_LIST);
    expect(result.attribution).toEqual({ handle: null, date: null, source: null });
  });

  it("throws when no pick matches the shelf", () => {
    const text = JSON.stringify({ idea: "x", picks: [{ title: "Nonexistent", why: "y" }] });
    expect(() => parseGlossResponse(text, READING_LIST)).toThrow(GlossParseError);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseGlossResponse("{not json", READING_LIST)).toThrow(GlossParseError);
  });

  it("throws when required fields are missing", () => {
    expect(() => parseGlossResponse('{"picks": []}', READING_LIST)).toThrow(GlossParseError);
  });
});
