import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { isFakeMode, runGloss } from "./anthropic.ts";

const port = Number(process.env.PORT ?? 8787);
const app = createApp({ runGloss });

// Serve the built frontend in production. `vite dev` serves it in development.
app.use("/assets/*", serveStatic({ root: "./dist" }));
app.use("/*", serveStatic({ root: "./dist" }));
// SPA fallback: any non-API GET that didn't hit a static file gets index.html.
app.get("*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: app.fetch, port }, (info) => {
  const mode = isFakeMode() ? " (fake LLM)" : "";
  console.log(`Gloss listening on http://localhost:${info.port}${mode}`);
  if (!isFakeMode() && !process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠  ANTHROPIC_API_KEY is not set — real glosses will fail until it is.");
  }
});
