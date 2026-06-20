import { createApp } from "../server/app.ts";
import { createGlossRunner } from "../server/anthropic.ts";

export interface Env {
  /** Anthropic API key — set as a Worker secret, never committed. */
  ANTHROPIC_API_KEY?: string;
  /** Set to "1" to return the deterministic stub instead of calling Anthropic. */
  GLOSS_FAKE_LLM?: string;
  /** Static-assets binding serving the built frontend from ./dist. */
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // The API runs the same Hono app as the Node server; everything else is a
    // static asset (with SPA fallback handled by the assets binding).
    if (url.pathname.startsWith("/api/")) {
      const app = createApp({
        runGloss: createGlossRunner({
          apiKey: env.ANTHROPIC_API_KEY,
          fake: env.GLOSS_FAKE_LLM === "1",
        }),
      });
      return app.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
