import { z } from "zod";
import type { Book, GlossInput, GlossResult } from "./types.ts";

/** The model Gloss runs on. Pinned per the product spec. */
export const MODEL = "claude-sonnet-4-6";

export class GlossInputError extends Error {}
export class GlossParseError extends Error {}

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

/** The system prompt: who Gloss is, the shelf, and the output contract. */
export function buildSystemPrompt(readingList: Book[]): string {
  const shelf = readingList
    .map((b) => `- "${b.title}" by ${b.author}\n    fits: ${b.themes.join("; ")}`)
    .join("\n");

  return `You are Gloss. A reader pastes a tweet (or thread, or just a URL) and you produce a single print-ready page that connects what they just read on the internet to what they should pull off their own shelf.

You are given a fixed reading list — the reader's actual shelf. Your job:
1. Extract the core idea of the tweet in one or two plain sentences. Capture the *specific* claim or tension, not the broad topic.
2. Pull attribution if you can find it: the author's handle, the date, and the source URL. Use null for anything you genuinely cannot determine. Do not invent attribution.
3. Choose 3 to 4 books FROM THE LIST BELOW — and only from this list — that speak to *this* idea. Match on the situation the tweet describes, not on keyword overlap. A book about org design can fit a tweet about a code review if the underlying situation rhymes.
4. For each chosen book write the "why": one or two sentences explaining why THIS book fits THIS tweet, right now. The connection must be earned and specific — reference the actual idea, not the genre. Never write a generic "this is a great book about X."

THE SHELF:
${shelf}

OUTPUT CONTRACT — respond with a single JSON object and nothing else (no prose, no markdown fences):
{
  "idea": string,
  "attribution": { "handle": string | null, "date": string | null, "source": string | null },
  "picks": [ { "title": string, "why": string } ]
}

Rules:
- Use book titles EXACTLY as written in the shelf above. Do not include the author in the title field.
- Provide between 3 and 4 picks. No duplicates.
- Keep each "why" to one or two sentences. Be concrete and specific to the tweet.
- Output only the JSON object.`;
}

/** The user turn: the pasted text and/or the URL to work from. */
export function buildUserPrompt(input: GlossInput): string {
  const parts: string[] = [];
  if (input.text) {
    parts.push(`Tweet text:\n"""\n${input.text}\n"""`);
  }
  if (input.url) {
    parts.push(`Source URL: ${input.url}`);
    if (!input.text) {
      parts.push(
        "No text was pasted — use the web_search tool to find what this URL says, then proceed.",
      );
    }
  }
  parts.push("Produce the gloss now as a single JSON object.");
  return parts.join("\n\n");
}

const rawResultSchema = z.object({
  idea: z.string().min(1),
  attribution: z
    .object({
      handle: z.string().nullable().default(null),
      date: z.string().nullable().default(null),
      source: z.string().nullable().default(null),
    })
    .default({ handle: null, date: null, source: null }),
  picks: z
    .array(
      z.object({
        title: z.string().min(1),
        why: z.string().min(1),
      }),
    )
    .min(1),
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
 * Parse and validate a model response into a GlossResult. Picks are reconciled
 * against the real shelf: unknown titles are dropped and authors are filled
 * from the list, so a hallucinated book or author can never reach the page.
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
  const picks = result.data.picks.flatMap((pick) => {
    const book = byTitle.get(pick.title.trim().toLowerCase());
    if (!book || seen.has(book.title)) return [];
    seen.add(book.title);
    return [{ title: book.title, author: book.author, why: pick.why.trim() }];
  });

  if (picks.length === 0) {
    throw new GlossParseError("None of the picks matched a book on the shelf.");
  }

  return {
    idea: result.data.idea.trim(),
    attribution: result.data.attribution,
    picks: picks.slice(0, 4),
  };
}
