import { Hono } from "hono";
import { GlossInputError, GlossParseError } from "../shared/gloss.ts";
import type { GlossRunner } from "./anthropic.ts";

export interface AppDeps {
  runGloss: GlossRunner;
}

/**
 * Build the API. The gloss runner is injected so tests can drive the routes
 * without touching the network.
 */
export function createApp({ runGloss }: AppDeps): Hono {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.post("/api/gloss", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Request body must be JSON." }, 400);
    }

    const { text, url } = (body ?? {}) as { text?: unknown; url?: unknown };
    if (text !== undefined && typeof text !== "string") {
      return c.json({ error: "`text` must be a string." }, 400);
    }
    if (url !== undefined && typeof url !== "string") {
      return c.json({ error: "`url` must be a string." }, 400);
    }

    try {
      const result = await runGloss({ text, url });
      return c.json(result);
    } catch (err) {
      if (err instanceof GlossInputError) {
        return c.json({ error: err.message }, 400);
      }
      if (err instanceof GlossParseError) {
        return c.json({ error: "Couldn't read a clean result back. Try again." }, 502);
      }
      console.error("gloss failed:", err);
      return c.json({ error: "Something went wrong generating the gloss." }, 500);
    }
  });

  return app;
}
