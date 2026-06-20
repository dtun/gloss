import type { Book } from "./types.ts";

/**
 * The reading list, baked in. v1 is built for one specific reader — a
 * developer / engineering leader who reads a lot of technical Twitter and owns
 * this particular shelf. Edit this file and rebuild to change the list.
 *
 * The `themes` notes are the matching surface: they describe the *situations*
 * each book speaks to, so a pick can be earned rather than tag-matched.
 */
export const READING_LIST: Book[] = [
  {
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt & David Thomas",
    themes: [
      "craft and pragmatism in everyday coding",
      "avoiding broken windows and tech debt",
      "DRY, orthogonality, and reversible decisions",
    ],
  },
  {
    title: "Refactoring",
    author: "Martin Fowler",
    themes: [
      "improving the design of existing code safely",
      "code smells and small behavior-preserving steps",
      "making change easy before making the change",
    ],
  },
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    themes: [
      "storage, replication, partitioning, consistency",
      "trade-offs between databases and stream/batch systems",
      "reasoning about reliability and scale",
    ],
  },
  {
    title: "The Mythical Man-Month",
    author: "Frederick P. Brooks Jr.",
    themes: [
      "why adding people to a late project makes it later",
      "communication overhead and conceptual integrity",
      "the second-system effect",
    ],
  },
  {
    title: "Accelerate",
    author: "Nicole Forsgren, Jez Humble & Gene Kim",
    themes: [
      "what actually drives software delivery performance",
      "deploy frequency, lead time, MTTR, change-fail rate",
      "evidence-based engineering practices",
    ],
  },
  {
    title: "The Manager's Path",
    author: "Camille Fournier",
    themes: [
      "the move from engineer to manager",
      "one-on-ones, feedback, and managing managers",
      "the day-to-day craft of engineering leadership",
    ],
  },
  {
    title: "An Elegant Puzzle",
    author: "Will Larson",
    themes: [
      "systems thinking applied to engineering organizations",
      "team sizing, org design, and migrations",
      "managing growth and technical debt at scale",
    ],
  },
  {
    title: "Staff Engineer",
    author: "Will Larson",
    themes: [
      "the technical-leadership track beyond senior",
      "influence without authority, technical strategy",
      "operating as a tech lead, architect, or solver",
    ],
  },
  {
    title: "A Philosophy of Software Design",
    author: "John Ousterhout",
    themes: [
      "managing complexity as the core problem",
      "deep modules, narrow interfaces, information hiding",
      "design it twice and the cost of shallow abstractions",
    ],
  },
  {
    title: "Working Effectively with Legacy Code",
    author: "Michael Feathers",
    themes: [
      "changing code you're afraid to touch",
      "breaking dependencies to get tests around code",
      "seams, characterization tests, and safe footholds",
    ],
  },
  {
    title: "The Phoenix Project",
    author: "Gene Kim, Kevin Behr & George Spafford",
    themes: [
      "DevOps and flow told as a novel",
      "work-in-progress, bottlenecks, and the theory of constraints",
      "rescuing a failing delivery organization",
    ],
  },
  {
    title: "Thinking in Systems",
    author: "Donella Meadows",
    themes: [
      "feedback loops, stocks, flows, and leverage points",
      "why systems resist change and produce surprises",
      "seeing structure behind recurring problems",
    ],
  },
  {
    title: "Team Topologies",
    author: "Matthew Skelton & Manuel Pais",
    themes: [
      "organizing teams for fast flow",
      "stream-aligned, platform, enabling, complicated-subsystem teams",
      "Conway's law and cognitive load",
    ],
  },
  {
    title: "The Design of Everyday Things",
    author: "Don Norman",
    themes: [
      "affordances, signifiers, and discoverability",
      "human-centered design and error as a design failure",
      "making the right thing obvious to do",
    ],
  },
  {
    title: "Crucial Conversations",
    author: "Patterson, Grenny, McMillan & Switzler",
    themes: [
      "high-stakes conversations where emotions run strong",
      "creating safety and speaking honestly",
      "disagreement, feedback, and decision-making with others",
    ],
  },
];
