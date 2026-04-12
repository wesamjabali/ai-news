import {
  getLatestSummary,
  getRecentSummaryCount,
  insertSummary,
} from "../database";
import {
  fetchBreakingFromSearch,
  fixBrokenMarkdownUrls,
  streamSummarizeNews,
} from "../utils/gemini";
import {
  appendInProgressContent,
  generating,
  newsEmitter,
  resetInProgressContent,
  setGenerating,
} from "../utils/newsEvents";
import { fetchAllNews } from "../utils/sources";

const CACHE_TTL_MS = 30_000;

let _cache: { response: any; expires: number } | null = null;

export function invalidateCache() {
  _cache = null;
}

function getWindowMs(): number {
  const {
    public: { updateWindowHours },
  } = useRuntimeConfig();
  return updateWindowHours * 60 * 60 * 1000;
}

function isFresh(createdAt: string): boolean {
  const created = new Date(createdAt + "Z");
  return Date.now() - created.getTime() < getWindowMs();
}

export async function generate() {
  setGenerating(true);
  resetInProgressContent();
  newsEmitter.emit("generation-start");
  try {
    const [articles, breakingFromSearch, previousSummary] = await Promise.all([
      fetchAllNews(),
      fetchBreakingFromSearch(),
      getLatestSummary(),
    ]);

    if (articles.length === 0 && breakingFromSearch.length === 0) {
      newsEmitter.emit("error", "Could not fetch news from any source.");
      return;
    }

    // Prepend search-sourced breaking news so they appear first in the prompt
    const allArticles = [...breakingFromSearch, ...articles];

    const previousReport = previousSummary
      ? {
          content: previousSummary.content,
          url: `/report/${previousSummary.id}`,
        }
      : undefined;

    let fullContent = "";
    for await (const chunk of streamSummarizeNews(
      allArticles,
      previousReport,
    )) {
      fullContent += chunk;
      appendInProgressContent(chunk);
      newsEmitter.emit("chunk", chunk);
    }

    fullContent = fixBrokenMarkdownUrls(fullContent);
    const newId = await insertSummary(fullContent);
    _cache = null;
    const createdAt = new Date().toISOString().replace("T", " ").slice(0, 19);
    newsEmitter.emit("done", { id: newId, createdAt });
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

  const {
    public: { updateWindowHours },
  } = useRuntimeConfig();
  const windowMinutes = updateWindowHours * 60;

  const latest = await getLatestSummary();
  const recentCount = await getRecentSummaryCount(windowMinutes);

  if (latest && isFresh(latest.createdAt)) {
    const response = {
      id: latest.id,
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
      id: latest.id,
      content: latest.content,
      createdAt: latest.createdAt,
      cached: true,
      generating: true,
      recentCount,
    };
  }

  return { generating: true, recentCount };
});
