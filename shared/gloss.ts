import { z } from "zod";
import type { Book, GlossInput, GlossResult } from "./types.ts";

/** The model Gloss runs on. Pinned per the product spec. */
export const MODEL = "claude-sonnet-4-6";

export class GlossInputError extends Error {}
export class GlossParseError extends Error {}
/** The model/tool call couldn't complete in time (usually a slow URL fetch). */
export class GlossUnavailableError extends Error {}

/** Throw if neither text nor a URL was supplied. */
export function normalizeInput(input: GlossInput): GlossInput {
  const text = input.text?.trim() || undefined;
  const url = input.url?.trim() || undefined;
  if (!text && !url) {
    throw new GlossInputError("Paste some tweet text or a URL to get started.");
  }
  return { text, url };
}

/** Best-effort handle extraction from an x.com / twitter.com URL. */
export function handleFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:x\.com|twitter\.com)\/(@?\w{1,15})(?:[/?#]|$)/i);
  if (!match) return null;
  const handle = match[1].replace(/^@/, "");
  const reserved = new Set(["i", "home", "search", "explore", "notifications", "messages"]);
  if (reserved.has(handle.toLowerCase())) return null;
  return `@${handle}`;
}

/** The system prompt: who Gloss is, the summary contract, and the shelf. */
export function buildSystemPrompt(readingList: Book[]): string {
  const shelf = readingList
    .map((b) => `- "${b.title}" by ${b.author}\n    fits: ${b.themes.join("; ")}`)
    .join("\n");

  return `You are Gloss. A reader pastes a post (a tweet, a thread, an article, or just a URL) and you produce a single print-ready page that summarizes it — so they can read the page instead of the post.

The summary is the product. Your job:
1. Write a one-sentence TL;DR that captures the whole post — the specific claim or argument, not the broad topic.
2. Pull out 3 to 5 key points: the substantive things the post actually says, each a tight standalone sentence (aim for under 20 words each). Capture the argument, evidence, and any concrete takeaways — not meta-commentary like "the author discusses...".
3. Pull attribution if you can find it: the author's handle, the date, and the source URL. Use null for anything you genuinely cannot determine. Do not invent attribution.
4. OPTIONALLY, add up to 2 "related reads" from the shelf below — and only from this list — if a book genuinely speaks to the post's situation. One short line each on why it relates. If nothing fits well, return an empty list. This is a small footer, not the point — never force it.

THE SHELF (for related reads only):
${shelf}

OUTPUT CONTRACT — respond with a single JSON object and nothing else (no prose, no markdown fences):
{
  "tldr": string,
  "keyPoints": [ string, ... ],
  "attribution": { "handle": string | null, "date": string | null, "source": string | null },
  "relatedReads": [ { "title": string, "why": string } ]
}

Rules:
- "keyPoints": 3 to 5 entries, each a single concise sentence.
- "relatedReads": 0 to 2 entries. Use book titles EXACTLY as written in the shelf above; do not put the author in the title. Keep each "why" to one short line (under 15 words). Prefer fewer or none over a weak match.
- Output only the JSON object.`;
}

/** The user turn: the pasted text and/or the URL to work from. */
export function buildUserPrompt(input: GlossInput): string {
  const parts: string[] = [];
  if (input.text) {
    parts.push(`Post text:\n"""\n${input.text}\n"""`);
  }
  if (input.url) {
    parts.push(`Source URL: ${input.url}`);
    if (!input.text) {
      parts.push(
        "No text was pasted — use the web_search tool to find what this URL says, then proceed.",
      );
    }
  }
  parts.push("Produce the summary now as a single JSON object.");
  return parts.join("\n\n");
}

const rawResultSchema = z.object({
  tldr: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
  attribution: z
    .object({
      handle: z.string().nullable().default(null),
      date: z.string().nullable().default(null),
      source: z.string().nullable().default(null),
    })
    .default({ handle: null, date: null, source: null }),
  relatedReads: z
    .array(
      z.object({
        title: z.string().min(1),
        why: z.string().min(1),
      }),
    )
    .default([]),
});

/**
 * Pull the first balanced top-level JSON object out of a model response. The
 * model is told to return bare JSON, but this tolerates stray prose or fences.
 */
export function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new GlossParseError("No JSON object found in the response.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new GlossParseError("Unbalanced JSON object in the response.");
}

/**
 * Parse and validate a model response into a GlossResult. Related reads are
 * reconciled against the real shelf: unknown titles are dropped and authors are
 * filled from the list, so a hallucinated book or author can never reach the
 * page. Related reads are optional — an empty list is valid.
 */
export function parseGlossResponse(text: string, readingList: Book[]): GlossResult {
  const json = extractJsonObject(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new GlossParseError("Response was not valid JSON.");
  }

  const result = rawResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new GlossParseError(`Response did not match the expected shape: ${result.error.message}`);
  }

  const byTitle = new Map(readingList.map((b) => [b.title.toLowerCase(), b]));
  const seen = new Set<string>();
  const relatedReads = result.data.relatedReads
    .flatMap((read) => {
      const book = byTitle.get(read.title.trim().toLowerCase());
      if (!book || seen.has(book.title)) return [];
      seen.add(book.title);
      return [{ title: book.title, author: book.author, why: read.why.trim() }];
    })
    .slice(0, 2);

  return {
    tldr: result.data.tldr.trim(),
    keyPoints: result.data.keyPoints.map((point) => point.trim()).filter(Boolean),
    attribution: result.data.attribution,
    relatedReads,
  };
}
