import {
  getLatestSummary,
  getRecentSummaryCount,
  insertSummary,
} from "../database";
import { streamSummarizeNews } from "../utils/gemini";
import {
  appendInProgressContent,
  generating,
  newsEmitter,
  resetInProgressContent,
  setGenerating,
} from "../utils/newsEvents";
import { fetchAllNews } from "../utils/sources";

const ONE_HOUR_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 30_000;

let _cache: { response: any; expires: number } | null = null;

export function invalidateCache() {
  _cache = null;
}

function isFresh(createdAt: string): boolean {
  const created = new Date(createdAt + "Z");
  return Date.now() - created.getTime() < ONE_HOUR_MS;
}

export async function generate() {
  setGenerating(true);
  resetInProgressContent();
  newsEmitter.emit("generation-start");
  try {
    const articles = await fetchAllNews();

    if (articles.length === 0) {
      newsEmitter.emit("error", "Could not fetch news from any source.");
      return;
    }

    let fullContent = "";
    for await (const chunk of streamSummarizeNews(articles)) {
      fullContent += chunk;
      appendInProgressContent(chunk);
      newsEmitter.emit("chunk", chunk);
    }

    await insertSummary(fullContent);
    _cache = null;
    const createdAt = new Date().toISOString().replace("T", " ").slice(0, 19);
    newsEmitter.emit("done", { createdAt });
  } catch (e: any) {
    newsEmitter.emit("error", e?.message || "Generation failed");
  } finally {
    setGenerating(false);
  }
}

export default defineEventHandler(async () => {
  // Serve from in-memory cache if fresh and not generating
  if (_cache && Date.now() < _cache.expires && !generating) {
    return _cache.response;
  }

  const latest = await getLatestSummary();
  const recentCount = await getRecentSummaryCount();

  if (latest && isFresh(latest.createdAt)) {
    const response = {
      content: latest.content,
      createdAt: latest.createdAt,
      cached: true,
      recentCount,
      generating,
    };

    if (!generating) {
      _cache = { response, expires: Date.now() + CACHE_TTL_MS };
    }

    return response;
  }

  _cache = null;

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
