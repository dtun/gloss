import { useState, type FormEvent } from "react";
import { GlossRequestError, requestGloss } from "./api.ts";
import { openPrintSheet } from "./openPrintSheet.ts";
import { formatAttribution } from "../shared/print.ts";
import type { GlossResult } from "../shared/types.ts";
import "./App.css";

type Status = "idle" | "loading" | "done" | "error";

export function App() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GlossResult | null>(null);

  const canSubmit = (text.trim() || url.trim()) && status !== "loading";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setError(null);
    try {
      const gloss = await requestGloss({ text, url });
      setResult(gloss);
      setStatus("done");
    } catch (err) {
      setError(err instanceof GlossRequestError ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <h1 className="wordmark">Gloss</h1>
        <p className="tagline">Drop a link. Get a page worth printing.</p>
      </header>

      <form className="composer" onSubmit={onSubmit}>
        <label className="field">
          <span className="field-label">Tweet or thread text</span>
          <textarea
            className="text-input"
            placeholder="Paste the tweet or thread here — pasted text is always the most reliable."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            aria-label="Tweet or thread text"
          />
        </label>

        <label className="field">
          <span className="field-label">x.com URL (optional)</span>
          <input
            className="url-input"
            type="url"
            inputMode="url"
            placeholder="https://x.com/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="x.com URL"
          />
          <span className="field-hint">A URL alone triggers a web-search fallback.</span>
        </label>

        <button className="generate" type="submit" disabled={!canSubmit}>
          {status === "loading" ? "Reading the shelf…" : "Gloss it"}
        </button>
      </form>

      {status === "error" && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {status === "done" && result && <Preview result={result} />}
    </div>
  );
}

function Preview({ result }: { result: GlossResult }) {
  const attribution = formatAttribution(result);
  const [printBlocked, setPrintBlocked] = useState(false);

  function onPrint() {
    const opened = openPrintSheet(result);
    setPrintBlocked(!opened);
  }

  return (
    <section className="preview" aria-label="Gloss preview">
      <div className="preview-bar">
        <span className="preview-label">Preview</span>
        <button className="print" type="button" onClick={onPrint}>
          Print this page
        </button>
      </div>

      {printBlocked && (
        <p className="error" role="alert">
          Your browser blocked the print tab. Allow pop-ups for this site and try again.
        </p>
      )}

      <div className="sheet">
        <div className="column">
          <h2 className="column-label">The idea</h2>
          <p className="idea">{result.idea}</p>
          {attribution && <p className="attribution">{attribution}</p>}
        </div>

        <div className="column">
          <h2 className="column-label">From your shelf</h2>
          <ul className="picks">
            {result.picks.map((pick) => (
              <li className="pick" key={pick.title}>
                <div className="pick-title">{pick.title}</div>
                <div className="pick-author">{pick.author}</div>
                <p className="pick-why">{pick.why}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
