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

  it("extracts from an x.com article URL", () => {
    expect(handleFromUrl("https://x.com/cathrynlavery/article/2068024981921914912")).toBe(
      "@cathrynlavery",
    );
  });

  it("ignores reserved paths and non-post URLs", () => {
    expect(handleFromUrl("https://x.com/home")).toBeNull();
    expect(handleFromUrl("https://example.com/blog")).toBeNull();
    expect(handleFromUrl(undefined)).toBeNull();
  });
});

describe("buildSystemPrompt", () => {
  it("frames the job as summarizing the post", () => {
    const prompt = buildSystemPrompt(READING_LIST);
    expect(prompt.toLowerCase()).toContain("summar");
    expect(prompt).toContain("tldr");
    expect(prompt).toContain("keyPoints");
  });

  it("still lists the shelf for the optional related reads", () => {
    const prompt = buildSystemPrompt(READING_LIST);
    expect(prompt).toContain(`"${READING_LIST[0].title}" by ${READING_LIST[0].author}`);
  });
});

describe("buildUserPrompt", () => {
  it("includes pasted text when present", () => {
    expect(buildUserPrompt({ text: "a post" })).toContain("a post");
  });

  it("asks for web search when only a URL is given", () => {
    expect(buildUserPrompt({ url: "https://x.com/a/status/1" })).toContain("web_search");
  });
});

describe("extractJsonObject", () => {
  it("pulls an object out of surrounding prose and fences", () => {
    expect(extractJsonObject('Sure!\n```json\n{"a": {"b": 2}}\n```\nDone.')).toBe(
      '{"a": {"b": 2}}',
    );
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
    tldr: "A non-technical founder now ships software herself with AI coding tools.",
    keyPoints: [
      "Years of hiring developers to build her ideas are over.",
      "She builds directly with Claude Code and Codex.",
      "The founder-to-engineer translation gap has effectively closed.",
    ],
    attribution: { handle: "@cathrynlavery", date: "2026-06-19", source: "https://x.com/c/a/1" },
    relatedReads: [
      { title: "The Mythical Man-Month", why: "It's about the communication gap she's closing." },
      {
        title: "A Philosophy of Software Design",
        why: "Complexity still accrues when you ship fast.",
      },
    ],
  });

  it("parses a good summary response", () => {
    const result = parseGlossResponse(valid, READING_LIST);
    expect(result.tldr).toContain("founder");
    expect(result.keyPoints).toHaveLength(3);
    expect(result.attribution.handle).toBe("@cathrynlavery");
  });

  it("reconciles related reads against the shelf and fills the author", () => {
    const result = parseGlossResponse(valid, READING_LIST);
    expect(result.relatedReads[0]).toEqual({
      title: "The Mythical Man-Month",
      author: "Frederick P. Brooks Jr.",
      why: "It's about the communication gap she's closing.",
    });
  });

  it("caps related reads at two and drops unknown books", () => {
    const text = JSON.stringify({
      tldr: "x",
      keyPoints: ["a"],
      relatedReads: [
        { title: "A Made Up Book", why: "nope" },
        { title: "Accelerate", why: "delivery" },
        { title: "Refactoring", why: "small steps" },
        { title: "Staff Engineer", why: "scope" },
      ],
    });
    const result = parseGlossResponse(text, READING_LIST);
    expect(result.relatedReads).toHaveLength(2);
    expect(result.relatedReads.map((r) => r.title)).toEqual(["Accelerate", "Refactoring"]);
  });

  it("is fine with no related reads at all", () => {
    const text = JSON.stringify({ tldr: "x", keyPoints: ["a", "b"] });
    const result = parseGlossResponse(text, READING_LIST);
    expect(result.relatedReads).toEqual([]);
    expect(result.attribution).toEqual({ handle: null, date: null, source: null });
  });

  it("throws when the summary is missing", () => {
    expect(() => parseGlossResponse('{"keyPoints": ["a"]}', READING_LIST)).toThrow(GlossParseError);
  });

  it("throws when there are no key points", () => {
    expect(() => parseGlossResponse('{"tldr": "x", "keyPoints": []}', READING_LIST)).toThrow(
      GlossParseError,
    );
  });

  it("throws on malformed JSON", () => {
    expect(() => parseGlossResponse("{not json", READING_LIST)).toThrow(GlossParseError);
  });
});
