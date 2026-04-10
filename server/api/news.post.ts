import { getRecentSummaryCount } from "../database";
import { isHomeRequest } from "../utils/homeCheck";
import { generating } from "../utils/newsEvents";
import { generate } from "./news.get";

const MAX_PER_HOUR = 2;

export default defineEventHandler(async (event) => {
  if (generating) {
    setResponseStatus(event, 429);
    return { error: "A briefing is already being generated." };
  }

  const isHome = await isHomeRequest(event);

  const recentCount = await getRecentSummaryCount();
  if (!isHome && recentCount >= MAX_PER_HOUR) {
    setResponseStatus(event, 429);
    return {
      error: "Rate limit reached. Maximum 2 briefings per hour.",
      recentCount,
    };
  }

  generate();

  return { ok: true, recentCount: recentCount + 1 };
});
