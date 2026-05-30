import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Format SQL queries from any dialect — PostgreSQL, MySQL, MariaDB, SQLite, SQL Server (T-SQL), Oracle (PL/SQL), BigQuery, Snowflake, Redshift, or generic ANSI. Configurable keyword case, indent, comma style, logical-operator placement, and line width. Multi-statement-aware. Runs entirely in your browser — pasted SQL never leaves the tab.",
  useCases: [
    {
      title: "Reading SQL from application logs",
      description:
        "Paste the one-line query your ORM emitted into the logs. The formatter expands CTEs, joins, and subqueries into something you can actually skim. Case-insensitive — `select`, `SELECT`, and `Select` all parse the same.",
    },
    {
      title: "Normalising a migration before review",
      description:
        "Drop a `.sql` file in to standardise indentation, comma style, and AND/OR placement to your team's convention. The diff view shows exactly what whitespace changed so reviewers don't lose time on layout.",
    },
    {
      title: "Sanity-checking dialect-specific syntax",
      description:
        "Picked BigQuery? `STRUCT<>` types and `UNNEST()` format correctly. Picked SQL Server? `TOP N` and `CROSS APPLY` keep their right shape. Picking the wrong dialect surfaces a parse error rather than silently mangling.",
    },
    {
      title: "Cleaning up auto-generated query strings",
      description:
        "Paste output from Prisma, ActiveRecord, SQLAlchemy, or a query builder. The single line of unindented SQL becomes properly indented, ready to drop into a Wiki, PR description, or Slack thread.",
    },
  ],
  faqs: [
    {
      question: "Which SQL dialects are supported?",
      answer:
        "Standard SQL (ANSI), PostgreSQL, MySQL, MariaDB, SQLite, SQL Server (T-SQL), Oracle (PL/SQL), BigQuery, Snowflake, and Amazon Redshift. The dialect picker also auto-detects when you drop a file in — `TOP N` → SQL Server, `RETURNING` → PostgreSQL, backticks → MySQL, etc.",
    },
    {
      question: "Does my SQL leave the browser?",
      answer:
        "No. The formatter is the `sql-formatter` package compiled to JavaScript, running locally in your browser. There's no server roundtrip. Safe for proprietary schema, embedded literals (passwords, API keys you didn't strip), or anything you wouldn't paste into a public pastebin.",
    },
    {
      question: "Will it change the meaning of my query?",
      answer:
        "No — only whitespace, indentation, and (optionally) keyword/identifier case. Identifiers and literals are preserved exactly. The Diff view shows exactly which lines moved or split, so you can confirm semantically nothing has shifted before pasting back.",
    },
    {
      question: "What's the difference between Output and Diff view?",
      answer:
        "Output shows the formatted result. Diff shows your original input and the formatted output side-by-side with line-by-line markers — useful for confirming the formatter only re-indented (didn't drop comments, rename tokens, etc.) before you commit the change.",
    },
    {
      question: "How does the leading-comma option work?",
      answer:
        "Toggles between `column1,` at the end of each line (trailing — Prettier-style) and `, column2` at the start (leading — DBA-style). Affects only top-level commas in SELECT / GROUP BY / ORDER BY; commas inside `VALUES (...)` tuples or function calls stay where they are.",
    },
    {
      question: "Why are AND / OR sometimes at the start of the next line?",
      answer:
        "That's the default — readability research suggests leading-AND lets you scan a WHERE clause vertically. Flip to trailing-AND in the Options menu if you prefer end-of-line. The setting persists across pages.",
    },
    {
      question: "Are keyboard shortcuts available?",
      answer:
        "`/` focuses the input, `⌘⇧C` copies the output, `⌘⇧D` toggles the diff view. The dropdown menus are keyboard-navigable; the dialect picker remembers your last choice in localStorage.",
    },
  ],
  relatedSlugs: ["code-formatter", "json-formatter", "diff-checker", "json-to-csv"],
} as const;

export function SqlFormatterContent() {
  return <ToolContent {...seoData} />;
}
