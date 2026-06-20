/** A single book in the baked-in reading list. */
export interface Book {
  /** Exact title — used as the stable key the model must pick by. */
  title: string;
  author: string;
  /**
   * Short situational notes describing when this book earns its place on the
   * shelf. These steer matching on *situation*, not keyword.
   */
  themes: string[];
}

/** What the user pastes in. At least one of `text` / `url` must be present. */
export interface GlossInput {
  /** Pasted tweet / thread text. Always the more reliable signal. */
  text?: string;
  /** A tweet (x.com) URL. Triggers a web-search fallback when text is sparse. */
  url?: string;
}

/** Attribution pulled from the source. Any field may be null when unknown. */
export interface Attribution {
  handle: string | null;
  date: string | null;
  source: string | null;
}

/** One matched book plus the written reason it fits *this* thing. */
export interface Pick {
  title: string;
  author: string;
  /** The earned connection — why this book, for this idea, right now. */
  why: string;
}

/** The print-ready result: the idea on the left, the picks on the right. */
export interface GlossResult {
  /** The core idea, distilled to a sentence or two. */
  idea: string;
  attribution: Attribution;
  picks: Pick[];
}
