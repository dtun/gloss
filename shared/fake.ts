import { handleFromUrl, normalizeInput } from "./gloss.ts";
import { READING_LIST } from "./readingList.ts";
import type { Book, GlossInput, GlossResult } from "./types.ts";

/** First sentence (or a trimmed slice) of the pasted text, for the idea field. */
function firstSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const end = trimmed.search(/[.!?]\s/);
  const candidate = end === -1 ? trimmed : trimmed.slice(0, end + 1);
  return candidate.length > 200 ? `${candidate.slice(0, 197)}…` : candidate;
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
 * GlossResult drawn from the actual shelf — so the app, and the e2e suite, run
 * end-to-end with no API key. Enabled by GLOSS_FAKE_LLM=1 on the server.
 */
export function fakeGloss(input: GlossInput): GlossResult {
  const { text, url } = normalizeInput(input);
  const seed = `${text ?? ""}|${url ?? ""}`;
  const idea = text
    ? firstSentence(text)
    : `A link with no pasted text (${url}) — paste the thread for a sharper read.`;

  const books = pickBooks(seed, 3, READING_LIST);
  const picks = books.map((book) => ({
    title: book.title,
    author: book.author,
    why: `Speaks to this directly: ${book.themes[0]}.`,
  }));

  return {
    idea,
    attribution: { handle: handleFromUrl(url), date: null, source: url ?? null },
    picks,
  };
}
