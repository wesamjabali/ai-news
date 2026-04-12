/**
 * Programmatic "No Updates Yet" section builder.
 *
 * Instead of asking the LLM to generate this section (which produces
 * hallucinated stories and broken links), we:
 * 1. Extract story headlines from the previous report's ### sub-headers.
 * 2. Carry forward any items already in the previous report's "No Updates Yet".
 * 3. After the LLM generates the new report, compare its ### headers against
 *    the previous stories to decide which ones were NOT covered.
 * 4. Build a deterministic "No Updates Yet" section with correct links.
 */

export interface PreviousStory {
  headline: string;
  summary: string;
  /** The report ID where this story was originally covered */
  reportId: number;
  /** Anchor slug matching MarkdownContent.vue's slugify */
  slug: string;
}

/**
 * Slugify matching the client-side MarkdownContent.vue implementation.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Strip markdown formatting to plain text (bold, links, images, inline code).
 */
function stripMarkdown(text: string): string {
  return (
    text
      // images
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // links – keep the text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // bold / italic
      .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
      .replace(/_{1,3}(.*?)_{1,3}/g, "$1")
      // inline code
      .replace(/`([^`]+)`/g, "$1")
      // blockquotes
      .replace(/^>\s*/gm, "")
      .trim()
  );
}

/** Sections whose ### sub-headers should NOT be treated as "stories" */
const SKIP_SECTIONS = new Set([
  "breaking news",
  "stories at a glance",
  "key takeaways",
  "no updates yet",
]);

/**
 * Extract story headlines and summaries from topic sections of a report.
 * Returns ### sub-headers from sections that are NOT in SKIP_SECTIONS.
 */
function extractTopicStories(
  markdown: string,
  reportId: number,
): PreviousStory[] {
  const stories: PreviousStory[] = [];

  // Split into ## sections – the first element is content before any ## header
  const parts = markdown.split(/^## /m);

  for (const part of parts) {
    // Section title is the first line (what followed "## ")
    const firstNewline = part.indexOf("\n");
    const sectionTitle =
      firstNewline >= 0 ? part.slice(0, firstNewline).trim() : part.trim();

    if (SKIP_SECTIONS.has(sectionTitle.toLowerCase())) continue;

    // Find all ### sub-headers in this section
    const h3Regex = /^### (.+)$/gm;
    let match;
    while ((match = h3Regex.exec(part)) !== null) {
      const headline = match[1].trim();
      const afterHeader = part.slice(match.index + match[0].length);

      // Content until the next ### or ## header (or end of section)
      const nextHeaderIdx = afterHeader.search(/^#{2,3} /m);
      const content =
        nextHeaderIdx >= 0
          ? afterHeader.slice(0, nextHeaderIdx)
          : afterHeader;

      const plain = stripMarkdown(content).replace(/\n+/g, " ").trim();
      // First sentence, capped at 200 chars
      const sentenceEnd = plain.search(/\.\s/);
      let summary =
        sentenceEnd >= 0 && sentenceEnd < 200
          ? plain.slice(0, sentenceEnd + 1)
          : plain.slice(0, 200);
      if (summary.length === 200 && !summary.endsWith(".")) summary += "…";
      if (!summary.endsWith(".") && !summary.endsWith("…")) summary += ".";

      stories.push({
        headline,
        summary,
        reportId,
        slug: slugify(headline),
      });
    }
  }

  return stories;
}

/**
 * Extract carried-forward stories from a report's "## No Updates Yet" section.
 * These already reference an older report, so we preserve the original link.
 */
function extractNoUpdateStories(
  markdown: string,
  fallbackReportId: number,
): PreviousStory[] {
  const stories: PreviousStory[] = [];

  // Grab everything between "## No Updates Yet" and the next ## (or end)
  const sectionMatch = markdown.match(
    /^## No Updates Yet\s*\n([\s\S]*?)(?=^## |\s*$)/m,
  );
  if (!sectionMatch) return stories;

  const sectionContent = sectionMatch[1];

  // Each bullet: - **Headline** — Summary text. [See previous report →](/report/ID#slug)
  const bulletRegex =
    /^-\s+\*\*(.+?)\*\*\s*[—–-]\s*([\s\S]*?)(?=^-\s+\*\*|$)/gm;
  let match;
  while ((match = bulletRegex.exec(sectionContent)) !== null) {
    const headline = match[1].trim();
    let body = match[2].trim();

    // Try to extract the report ID from the link
    const linkMatch = body.match(/\[.*?\]\(\/report\/(\d+)/);
    const reportId = linkMatch ? parseInt(linkMatch[1], 10) : fallbackReportId;

    // Strip the link text from the summary
    body = body.replace(/\[.*?\]\(.*?\)/g, "").trim();
    // Clean trailing punctuation artifacts
    body = body.replace(/\s*$/, "");
    if (!body.endsWith(".") && !body.endsWith("…")) body += ".";

    stories.push({
      headline,
      summary: body,
      reportId,
      slug: slugify(headline),
    });
  }

  return stories;
}

/**
 * Gather all stories from a previous report that need tracking.
 */
export function extractPreviousStories(
  markdown: string,
  reportId: number,
): PreviousStory[] {
  const topicStories = extractTopicStories(markdown, reportId);
  const carriedStories = extractNoUpdateStories(markdown, reportId);

  // Deduplicate by slug
  const seen = new Set<string>();
  const all: PreviousStory[] = [];
  for (const story of [...topicStories, ...carriedStories]) {
    if (!seen.has(story.slug)) {
      seen.add(story.slug);
      all.push(story);
    }
  }
  return all;
}

/**
 * Extract ### header texts from a markdown report.
 */
function extractH3Headers(markdown: string): string[] {
  const headers: string[] = [];
  const regex = /^### (.+)$/gm;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    headers.push(match[1].trim());
  }
  return headers;
}

/**
 * Significant words (length > 3, not common stop words).
 */
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "have",
  "been",
  "from",
  "they",
  "with",
  "this",
  "that",
  "what",
  "which",
  "when",
  "will",
  "more",
  "some",
  "than",
  "them",
  "into",
  "over",
  "also",
  "after",
  "about",
  "between",
  "through",
  "during",
  "before",
  "could",
  "other",
  "their",
  "there",
  "would",
  "report",
  "reports",
  "update",
  "updates",
  "latest",
  "news",
  "new",
]);

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

/**
 * Check if a previous story was covered in the new report.
 * Uses word-overlap between the previous headline and new ### headers.
 */
function isStoryCovered(
  story: PreviousStory,
  newHeaders: string[],
  newFullText: string,
): boolean {
  const prevWords = significantWords(story.headline);
  if (prevWords.length === 0) return false;

  // Check against each new ### header
  for (const header of newHeaders) {
    const headerWords = significantWords(header);
    const overlap = prevWords.filter(
      (w) =>
        headerWords.includes(w) ||
        headerWords.some((hw) => hw.includes(w) || w.includes(hw)),
    ).length;
    // If ≥40% of the previous headline's significant words match a new header
    if (overlap >= Math.ceil(prevWords.length * 0.4)) return true;
  }

  // Fallback: check the full new report text (looser — needs ≥60% overlap)
  const lowerText = newFullText.toLowerCase();
  const textOverlap = prevWords.filter((w) => lowerText.includes(w)).length;
  if (textOverlap >= Math.ceil(prevWords.length * 0.6)) return true;

  return false;
}

/**
 * Strip any LLM-generated "## No Updates Yet" section from the output.
 */
export function stripNoUpdatesSection(markdown: string): string {
  // Remove "## No Updates Yet" and everything until the next ## header or end
  return markdown.replace(
    /\n*^## No Updates Yet\s*\n[\s\S]*?(?=^## |\s*$)/m,
    "",
  );
}

/**
 * Build the programmatic "## No Updates Yet" section.
 *
 * @param newReport  The LLM-generated report (without "No Updates Yet")
 * @param previousStories Stories extracted from the previous report
 * @returns The markdown section to append, or empty string if all stories were covered.
 */
export function buildNoUpdatesSection(
  newReport: string,
  previousStories: PreviousStory[],
): string {
  if (previousStories.length === 0) return "";

  const newHeaders = extractH3Headers(newReport);
  const uncovered = previousStories.filter(
    (story) => !isStoryCovered(story, newHeaders, newReport),
  );

  if (uncovered.length === 0) return "";

  const bullets = uncovered.map((story) => {
    const link = `/report/${story.reportId}#${story.slug}`;
    return `- **${story.headline}** — ${story.summary} [See previous report →](${link})`;
  });

  return `\n\n## No Updates Yet\n\n${bullets.join("\n")}\n`;
}

/**
 * Format previous story headlines for inclusion in the LLM prompt,
 * so the LLM knows not to re-cover them.
 */
export function formatPreviousStoriesForPrompt(
  stories: PreviousStory[],
): string {
  if (stories.length === 0) return "";

  const lines = stories.map(
    (s, i) => `${i + 1}. ${s.headline} — ${s.summary}`,
  );

  return `## Previously Covered Stories

The following stories were covered in previous briefings. Do NOT re-cover them unless there are genuinely new developments in today's articles. If a story has no new developments, simply omit it entirely — a "No Updates Yet" section will be generated automatically after your output.

${lines.join("\n")}`;
}
