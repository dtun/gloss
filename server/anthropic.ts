import Anthropic from "@anthropic-ai/sdk";
import {
  MODEL,
  buildSystemPrompt,
  buildUserPrompt,
  normalizeInput,
  parseGlossResponse,
} from "../shared/gloss.ts";
import { fakeGloss } from "../shared/fake.ts";
import { READING_LIST } from "../shared/readingList.ts";
import type { GlossInput, GlossResult } from "../shared/types.ts";

/** A function that turns an input into a finished gloss. Injected into the app. */
export type GlossRunner = (input: GlossInput) => Promise<GlossResult>;

/** Runtime-agnostic config: credentials and mode come from the caller, not the env. */
export interface GlossConfig {
  /** Anthropic API key. Unused (and unneeded) when `fake` is true. */
  apiKey?: string;
  /** Skip the network and return a deterministic stub (e2e, local, no key). */
  fake?: boolean;
}

/**
 * Build a gloss runner bound to the given config. Keeping config explicit (vs
 * reading process.env inside) lets the same code run on Node and on Workers,
 * where env arrives as a binding rather than process.env.
 */
export function createGlossRunner(config: GlossConfig): GlossRunner {
  return async (input) => {
    const normalized = normalizeInput(input);
    if (config.fake) return fakeGloss(normalized);

    const client = new Anthropic({ apiKey: config.apiKey });
    const system = buildSystemPrompt(READING_LIST);
    const tools = normalized.url
      ? [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 3 }]
      : [];

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildUserPrompt(normalized) },
    ];

    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      tools,
      messages,
    });

    // Server-side tools may pause after the iteration cap; resume until done.
    let guard = 0;
    while (response.stop_reason === "pause_turn" && guard < 5) {
      guard += 1;
      messages.push({ role: "assistant", content: response.content });
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system,
        tools,
        messages,
      });
    }

    if (response.stop_reason === "refusal") {
      throw new Error("The model declined to gloss this input.");
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      throw new Error("The model returned no text to parse.");
    }

    return parseGlossResponse(text, READING_LIST);
  };
}
