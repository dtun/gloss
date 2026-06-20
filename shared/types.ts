/** A single book in the baked-in reading list. */
export interface Book {
  /** Exact title — used as the stable key the model must pick by. */
  title: string;
  author: string;
  /**
   * Short situational notes describing when this book earns its place on the
   * shelf. These steer the (secondary) related-reading match on situation.
   */
  themes: string[];
}

/** What the user pastes in. At least one of `text` / `url` must be present. */
export interface GlossInput {
  /** Pasted post / thread text. Always the more reliable signal. */
  text?: string;
  /** A post (x.com) URL. Triggers a web-search fallback when text is sparse. */
  url?: string;
}

/** Attribution pulled from the source. Any field may be null when unknown. */
export interface Attribution {
  handle: string | null;
  date: string | null;
  source: string | null;
}

/** A small, optional "related reading" note — one book, one line on why. */
export interface RelatedRead {
  title: string;
  author: string;
  /** A single short line on why it relates. Kept terse so the page stays one page. */
  why: string;
}

/**
 * The print-ready result: a summary of the post is the point — a one-line TL;DR
 * plus a few key points — with at most a couple of related reads as a footer.
 */
export interface GlossResult {
  /** One sentence capturing the whole post. */
  tldr: string;
  /** The substance, as a few tight bullets. */
  keyPoints: string[];
  attribution: Attribution;
  /** 0–2 books from the shelf, demoted to a small footer. */
  relatedReads: RelatedRead[];
}
