import { handleFromUrl, normalizeInput } from "./gloss.ts";
import { READING_LIST } from "./readingList.ts";
import type { Book, GlossInput, GlossResult } from "./types.ts";

/** Split text into sentences, trimmed and non-empty. */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Deterministically pick `n` books seeded by the input, with no repeats. */
function pickBooks(seed: string, n: number, list: Book[]): Book[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const start = list.length > 0 ? hash % list.length : 0;
  const out: Book[] = [];
  for (let i = 0; i < n && i < list.length; i++) {
    out.push(list[(start + i * 5) % list.length]);
  }
  return out;
}

/**
 * A deterministic stand-in for the Anthropic call. Returns a real, shaped
 * GlossResult — a TL;DR, a few key points, and a couple of related reads — so
 * the app and the e2e suite run end-to-end with no API key. Enabled by
 * GLOSS_FAKE_LLM=1 on the server.
 */
export function fakeGloss(input: GlossInput): GlossResult {
  const { text, url } = normalizeInput(input);
  const seed = `${text ?? ""}|${url ?? ""}`;

  const parts = text ? sentences(text) : [];
  const tldr =
    parts[0] ?? `A link with no pasted text (${url}) — paste the post for a real summary.`;
  const keyPoints = (parts.length > 1 ? parts.slice(0, 5) : [tldr]).map((s) =>
    s.length > 160 ? `${s.slice(0, 157)}…` : s,
  );

  const relatedReads = pickBooks(seed, 2, READING_LIST).map((book) => ({
    title: book.title,
    author: book.author,
    why: book.themes[0],
  }));

  return {
    tldr,
    keyPoints,
    attribution: { handle: handleFromUrl(url), date: null, source: url ?? null },
    relatedReads,
  };
}
