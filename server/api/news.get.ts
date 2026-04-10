import { getLatestSummary, insertSummary } from "../database";
import { summarizeNews } from "../utils/gemini";
import { fetchAllNews } from "../utils/sources";

const ONE_HOUR_MS = 60 * 60 * 1000;

function isFresh(createdAt: string): boolean {
  const created = new Date(createdAt + "Z");
  return Date.now() - created.getTime() < ONE_HOUR_MS;
}

let generating = false;

export default defineEventHandler(async () => {
  const latest = await getLatestSummary();

  if (latest && isFresh(latest.createdAt)) {
    return {
      content: latest.content,
      createdAt: latest.createdAt,
      cached: true,
    };
  }

  if (generating) {
    if (latest) {
      return {
        content: latest.content,
        createdAt: latest.createdAt,
        cached: true,
      };
    }
    return { generating: true };
  }

  generating = true;
  try {
    const articles = await fetchAllNews();

    if (articles.length === 0) {
      throw createError({
        statusCode: 502,
        statusMessage: "Could not fetch news from any source.",
      });
    }

    const content = await summarizeNews(articles);
    await insertSummary(content);

    return {
      content,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      cached: false,
    };
  } finally {
    generating = false;
  }
});
