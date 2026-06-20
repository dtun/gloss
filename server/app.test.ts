import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import type { GlossRunner } from "./anthropic.ts";
import { GlossInputError, GlossParseError, GlossUnavailableError } from "../shared/gloss.ts";
import type { GlossResult } from "../shared/types.ts";

const result: GlossResult = {
  tldr: "Small reversible steps beat big rewrites.",
  keyPoints: ["Big-bang rewrites usually fail.", "Ship small, reversible changes instead."],
  attribution: { handle: "@p", date: null, source: null },
  relatedReads: [{ title: "Refactoring", author: "Martin Fowler", why: "small safe steps" }],
};

function appWith(runGloss: GlossRunner) {
  return createApp({ runGloss });
}

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const app = appWith(vi.fn<GlossRunner>());
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("POST /api/gloss", () => {
  it("returns the gloss for a valid request", async () => {
    const runGloss = vi.fn<GlossRunner>().mockResolvedValue(result);
    const app = appWith(runGloss);

    const res = await app.request("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "a tweet about refactoring" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(runGloss).toHaveBeenCalledWith({ text: "a tweet about refactoring", url: undefined });
  });

  it("rejects a non-JSON body", async () => {
    const app = appWith(vi.fn<GlossRunner>());
    const res = await app.request("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-string field", async () => {
    const app = appWith(vi.fn<GlossRunner>());
    const res = await app.request("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: 42 }),
    });
    expect(res.status).toBe(400);
  });

  it("maps an input error to 400", async () => {
    const runGloss = vi.fn<GlossRunner>().mockRejectedValue(new GlossInputError("paste something"));
    const app = appWith(runGloss);
    const res = await app.request("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "paste something" });
  });

  it("maps an unavailable (timeout) error to 504 with its message", async () => {
    const runGloss = vi
      .fn<GlossRunner>()
      .mockRejectedValue(new GlossUnavailableError("Couldn't read that link in time."));
    const app = appWith(runGloss);
    const res = await app.request("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://x.com/a/article/1" }),
    });
    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({ error: "Couldn't read that link in time." });
  });

  it("maps a parse error to 502", async () => {
    const runGloss = vi.fn<GlossRunner>().mockRejectedValue(new GlossParseError("bad shape"));
    const app = appWith(runGloss);
    const res = await app.request("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "x" }),
    });
    expect(res.status).toBe(502);
  });

  it("maps an unexpected error to 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const runGloss = vi.fn<GlossRunner>().mockRejectedValue(new Error("boom"));
    const app = appWith(runGloss);
    const res = await app.request("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "x" }),
    });
    expect(res.status).toBe(500);
  });
});
