import {
  getLatestSummary,
  getRecentSummaryCount,
  insertSummary,
} from "../database";
import { streamSummarizeNews } from "../utils/gemini";
import { generating, newsEmitter, setGenerating } from "../utils/newsEvents";
import { fetchAllNews } from "../utils/sources";

const ONE_HOUR_MS = 60 * 60 * 1000;

function isFresh(createdAt: string): boolean {
  const created = new Date(createdAt + "Z");
  return Date.now() - created.getTime() < ONE_HOUR_MS;
}

export async function generate() {
  setGenerating(true);
  try {
    const articles = await fetchAllNews();

    if (articles.length === 0) {
      newsEmitter.emit("error", "Could not fetch news from any source.");
      return;
    }

    let fullContent = "";
    for await (const chunk of streamSummarizeNews(articles)) {
      fullContent += chunk;
      newsEmitter.emit("chunk", chunk);
    }

    await insertSummary(fullContent);
    const createdAt = new Date().toISOString().replace("T", " ").slice(0, 19);
    newsEmitter.emit("done", { createdAt });
  } catch (e: any) {
    newsEmitter.emit("error", e?.message || "Generation failed");
  } finally {
    setGenerating(false);
  }
}

export default defineEventHandler(async () => {
  const latest = await getLatestSummary();
  const recentCount = await getRecentSummaryCount();

  if (latest && isFresh(latest.createdAt)) {
    return {
      content: latest.content,
      createdAt: latest.createdAt,
      cached: true,
      recentCount,
      generating,
    };
  }

  if (!generating) {
    generate();
  }

  if (latest) {
    return {
      content: latest.content,
      createdAt: latest.createdAt,
      cached: true,
      generating: true,
      recentCount,
    };
  }

  return { generating: true, recentCount };
});
