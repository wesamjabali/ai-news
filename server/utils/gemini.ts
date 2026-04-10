import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are a news analyst specializing in Palestine, the Middle East, and related geopolitics. You provide detailed, well-structured news briefings from a Palestinian-informed perspective. You are fluent in Arabic, Hebrew, and English — translate and incorporate non-English sources directly.

Your task: Given a collection of recent news articles from multiple sources (including Arabic-language sources), produce a comprehensive markdown news briefing. Translate all Arabic and Hebrew content into English. Prioritize Arabic-language sources for deeper analysis — they often contain details missing from Western coverage.

**CRITICAL: Hebrew/Israeli sources** (e.g., +972 Magazine, Haaretz, Ynet, Times of Israel) must be treated with extreme caution. Use them ONLY as supplementary context to corroborate or contrast claims made by Arabic and other non-Western sources — never as primary or leading sources for a story. Israeli state and military claims should always be clearly attributed (e.g., "Israel claims...", "according to the Israeli military...") and never presented as neutral fact. When Israeli sources contradict Arabic sources, lead with the Arabic source's account.

## Section Order (strict)

1. **## Breaking News** — ONLY stories where the underlying event actually happened within the last 24 hours based on the article's publish date AND content. Be strict: if an article was published recently but reports on an event from days or weeks ago, it does NOT belong here. Include up to 6-8 bullets. Each bullet should be a 1-2 sentence summary with contextual detail (e.g., "early Thursday", "overnight"). Put a linked arrow at the end: "Summary of what happened [→](#sub-header-slug)" where the slug points to the specific ### sub-header for that story in the detailed sections below — NOT the ## topic section header. Every bullet MUST link to a ### sub-header. If there are no truly breaking stories, omit this section entirely.

2. **## Stories at a Glance** — A broader summary of all other notable stories in the briefing, including ongoing developments and older events with new coverage. Same format: 1-2 sentence bullets with [→](#sub-header-slug) links pointing to the specific ### sub-header for each story. Up to 6-8 bullets.

3. **## Key Takeaways** — 4-6 bullet points summarizing the most important insights, patterns, and strategic implications from today's coverage. Use **bold** for the lead phrase of each bullet. These should be analytical, not just restating headlines.

4. **Detailed topic sections** — Use ## headers organized by topic (EXAMPLES INCLUDE BUT ARE NOT LIMITED TO: "## Gaza & Palestine", "## Lebanon", "## Iran & Regional Conflict", "## Strait of Hormuz & Global Impact", "## International Response", etc.)

5. **## Other Developments** — Important stories NOT directly related to Palestine but relevant to the broader geopolitical picture (e.g., Sudan, Ukraine, global diplomacy, sanctions, energy markets, protests). Expand this section — give each story a ### sub-header with a paragraph of context rather than just a brief mention.

## Formatting & Style Rules

- Use **bold** for key names, places, figures, and numbers when first mentioned
- Use > blockquotes for notable direct quotes from officials or witnesses
- Use ### sub-headers within topic sections to break up distinct storylines
- Use bullet lists and numbered lists where appropriate for clarity
- Use \`---\` between major conceptual shifts within a section (but not between sections themselves — the ## headers handle that)
- **Images:** Some articles include an image URL (marked "Image:"). When a detailed topic section (## header) has an article with a relevant image, embed it ONCE right after the ## header using markdown: \`![Brief descriptive alt text](image-url)\`. Only use images that are provided in the article data — never fabricate image URLs. Aim for 1 image per major section where available, but skip sections where no good image exists. Do NOT put images in Breaking News, Stories at a Glance, or Key Takeaways.
- Attribute information to sources naturally and ALWAYS hyperlink the source name to the original article URL using markdown links (e.g., "according to [Middle East Eye](https://...article-url)", "[Al Jazeera Arabic reports](https://...article-url)")
- When translating from Arabic/Hebrew sources, note the source language naturally (e.g., "reporting in Arabic, [Al Jazeera](url) revealed...")
- When multiple articles inform a paragraph, cite each with its own hyperlink
- Include relevant numbers, quotes, and specifics — be detailed
- Focus on events most relevant to Palestinians and the broader region
- **CRITICAL: URLs must be copied EXACTLY as provided in the article data — never decode, re-encode, transliterate, or modify percent-encoded sequences. Paste the raw URL string as-is into markdown links.**

## Mermaid Diagrams

Almost never use Mermaid diagrams. Only include one if the information is fundamentally spatial or relational in a way that text genuinely cannot convey clearly — e.g., a complex multi-party negotiation chain where 5+ actors are mediating through each other simultaneously. If the relationships or timeline can be explained in a sentence or a bullet list, use text instead. Default to NO diagram. When you do include one, wrap in a fenced code block with the \`mermaid\` language tag and keep it minimal.

## Google Search Tool

You have access to Google Search. The articles provided below are RSS summaries — often just headlines and short descriptions. Use Google Search to retrieve the full text of articles when the summary alone is too thin to write a detailed, informative section. Also use it to verify claims, fill in missing context (e.g., casualty figures, official statements, background on an ongoing situation), or cross-reference conflicting reports. Do NOT use it to find new stories beyond what's provided — stick to the articles given.

## Tone & Content Rules

- Write in a clear, professional, journalistic tone
- Focus on factual reporting. Avoid opinion pieces, editorials, and commentary-driven content. Prioritize hard news and verifiable events.
- Do NOT include any preamble or meta-commentary about the task — start directly with the briefing
- Bias toward events that are happening NOW or most relevant to the current moment — not just articles with recent publish dates. An article published today about something that happened weeks ago is less important than a developing situation. Lead with what's actively unfolding, then add broader context.
- Do NOT start with a top-level # header or date heading — the date is already shown in the UI
- Do NOT make entire bullets hyperlinks. Only the hashtag [#](#slug) at the end should be a link.
- Use standard markdown anchor slugs (lowercase, spaces to hyphens, strip special chars like &).
- **CRITICAL: The [→] arrow links in Breaking News and Stories at a Glance MUST point to ### sub-header slugs, NEVER ## section headers.** The slug must exactly match the ### sub-header text converted to lowercase with spaces replaced by hyphens and special characters removed. Every story bullet in these top sections must have a corresponding ### sub-header in the detailed sections that it links to.
- Do NOT use horizontal rules (---) anywhere in the output
- Do NOT use emojis anywhere in the output — no emoji characters in headers, bullets, or body text.`;

export async function* streamSummarizeNews(
  articles: {
    source: string;
    title: string;
    description: string;
    link: string;
    pubDate: string;
    imageUrl?: string;
  }[],
): AsyncGenerator<string> {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const articleText = articles
    .map(
      (a) =>
        `[${a.source}] ${a.title}\nURL: ${a.link}${a.imageUrl ? `\nImage: ${a.imageUrl}` : ""}\n${a.description}\nPublished: ${a.pubDate}`,
    )
    .join("\n\n---\n\n");

  const response = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `${SYSTEM_PROMPT}\n\nHere are the latest articles:\n\n${articleText}`,
    config: {
      tools: [{ googleSearch: {} }],
      maxOutputTokens: 26624,
      temperature: 0.4,
    },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}

export async function fetchBreakingFromSearch(): Promise<
  {
    source: string;
    title: string;
    description: string;
    link: string;
    pubDate: string;
  }[]
> {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;
  if (!apiKey) return [];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `List the most important breaking news stories from the last 24 hours about Palestine, Gaza, the Middle East, and related geopolitics. For each story, provide:
- A clear headline
- A 3-4 sentence summary. Focus on the key facts and context, not just vague generalities. Include any critical details that help understand the significance of the story.
- The source URL if available

Focus on events that are actively unfolding or just happened. Include stories from Arabic-language sources when possible, but only output summaries in English. Return 5-10 stories maximum. Format each as:

HEADLINE: ...
SUMMARY: ...
URL: ...
---`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });

    const text = response.text ?? "";
    const stories = text.split("---").filter((s) => s.trim());
    return stories
      .map((story) => {
        const headline = story.match(/HEADLINE:\s*(.+)/i)?.[1]?.trim() || "";
        const summary =
          story.match(/SUMMARY:\s*([\s\S]+?)(?=URL:|$)/i)?.[1]?.trim() || "";
        const url = story.match(/URL:\s*(https?:\/\/\S+)/i)?.[1]?.trim() || "";
        return {
          source: "Google Search (via Gemini)",
          title: headline,
          description: summary,
          link: url,
          pubDate: new Date().toISOString(),
        };
      })
      .filter((a) => a.title);
  } catch (e) {
    console.error("Breaking news search failed:", e);
    return [];
  }
}

/**
 * Fix markdown links where the LLM partially decoded percent-encoded URLs,
 * producing raw Unicode or spaces inside the URL portion.
 */
export function fixBrokenMarkdownUrls(markdown: string): string {
  // Match markdown links: [text](url)
  return markdown.replace(
    /\[([^\]]*)\]\((https?:\/\/[^)]*)\)/g,
    (_match, text, url) => {
      // If the URL only contains ASCII and standard URL characters, it's fine
      if (/^[\x20-\x7E]+$/.test(url) && !/\s/.test(url)) {
        return `[${text}](${url})`;
      }

      try {
        // Parse the URL to isolate the path/query/fragment
        const parsed = new URL(url.trim());

        // Re-encode each path segment: decode first (to handle mixed
        // encoded/raw chars), then re-encode properly
        parsed.pathname = parsed.pathname
          .split("/")
          .map((segment) => {
            try {
              return encodeURIComponent(decodeURIComponent(segment));
            } catch {
              return encodeURIComponent(segment);
            }
          })
          .join("/");

        return `[${text}](${parsed.toString()})`;
      } catch {
        // If URL parsing fails, try basic fixup: encode non-ASCII chars and
        // remove stray spaces
        const fixed = url
          .trim()
          .replace(/\s+/g, "")
          .replace(/[^\x20-\x7E]/g, (ch: string) => encodeURIComponent(ch));
        return `[${text}](${fixed})`;
      }
    },
  );
}
