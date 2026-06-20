import type { GlossInput, GlossResult } from "../shared/types.ts";

/** Thrown for any non-2xx response, carrying the server's message. */
export class GlossRequestError extends Error {}

/** Call the backend to produce a gloss for the given input. */
export async function requestGloss(input: GlossInput): Promise<GlossResult> {
  let res: Response;
  try {
    res = await fetch("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new GlossRequestError("Couldn't reach the server. Is it running?");
  }

  if (!res.ok) {
    const message = await res
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => undefined);
    throw new GlossRequestError(message ?? "Something went wrong. Try again.");
  }

  return (await res.json()) as GlossResult;
}
