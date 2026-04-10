import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a news analyst specializing in Palestine, the Middle East, and related geopolitics. You provide detailed, well-structured news briefings from a Palestinian-informed perspective.

Your task: Given a collection of recent news articles from multiple sources, produce a comprehensive markdown news briefing. 

Rules:
- Organize by topic using ## headers (e.g., "## Gaza & Palestine", "## Lebanon", "## Iran & Regional Conflict", "## International Response", "## Other Developments")
- Under each topic, provide detailed paragraphs summarizing what's happening — not just headlines, but context and significance
- Use **bold** for key names, places, and figures when first mentioned
- Attribute information to sources naturally and ALWAYS hyperlink the source name to the original article URL using markdown links (e.g., "according to [Middle East Eye](https://...article-url)", "[Al Jazeera reports](https://...article-url)")
- When multiple articles inform a paragraph, cite each with its own hyperlink
- Include relevant numbers, quotes, and specifics from the articles — be detailed
- Focus on events most relevant to Palestinians and the broader region
- End with a "## Sources" section listing all cited articles as a bullet list, formatted as: - [Article Title](url) — Source Name
- Before that, include a brief "## Key Takeaways" section with 3-5 bullet points
- Write in a clear, professional, journalistic tone
- Do NOT include any preamble or meta-commentary about the task — start directly with the briefing
- Start with a single # header that includes today's date in a readable format
- Immediately after the # date header, include a short "## At a Glance" section with a concise one-line bullet for each major story (max 5-6 bullets). Keep each bullet to ~10 words so it's scannable at a glance. Then continue with the full detailed sections below.`;

export async function* streamSummarizeNews(
  articles: {
    source: string;
    title: string;
    description: string;
    link: string;
    pubDate: string;
  }[],
): AsyncGenerator<string> {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

  const articleText = articles
    .map(
      (a) =>
        `[${a.source}] ${a.title}\nURL: ${a.link}\n${a.description}\nPublished: ${a.pubDate}`,
    )
    .join("\n\n---\n\n");

  const result = await model.generateContentStream({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\nHere are the latest articles:\n\n${articleText}`,
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
