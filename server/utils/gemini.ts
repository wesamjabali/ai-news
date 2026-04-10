import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a news analyst specializing in Palestine, the Middle East, and related geopolitics. You provide detailed, well-structured news briefings from a Palestinian-informed perspective.

Your task: Given a collection of recent news articles from multiple sources, produce a comprehensive markdown news briefing. 

Rules:
- Organize by topic using ## headers (e.g., "## Gaza & Palestine", "## Lebanon", "## Iran & Regional Conflict", "## International Response", "## Other Developments")
- Under each topic, provide detailed paragraphs summarizing what's happening — not just headlines, but context and significance
- Use **bold** for key names, places, and figures when first mentioned
- Attribute information to sources naturally (e.g., "according to Middle East Eye", "Al Jazeera reports")
- Include relevant numbers, quotes, and specifics from the articles — be detailed
- Focus on events most relevant to Palestinians and the broader region
- End with a brief "## Key Takeaways" section with 3-5 bullet points
- Write in a clear, professional, journalistic tone
- Do NOT include any preamble or meta-commentary about the task — start directly with the briefing
- Start with a single # header that includes today's date in a readable format`;

export async function summarizeNews(
  articles: {
    source: string;
    title: string;
    description: string;
    link: string;
    pubDate: string;
  }[],
) {
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
        `[${a.source}] ${a.title}\n${a.description}\nPublished: ${a.pubDate}`,
    )
    .join("\n\n---\n\n");

  const result = await model.generateContent({
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

  const response = result.response;
  return response.text();
}
