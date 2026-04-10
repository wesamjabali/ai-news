import { getRecentSummaryCount } from "../database";
import { generating } from "../utils/newsEvents";
import { generate } from "./news.get";

const MAX_PER_HOUR = 3;

export default defineEventHandler(async (event) => {
  if (generating) {
    setResponseStatus(event, 429);
    return { error: "A briefing is already being generated." };
  }

  const recentCount = await getRecentSummaryCount();
  if (recentCount >= MAX_PER_HOUR) {
    setResponseStatus(event, 429);
    return {
      error: "Rate limit reached. Maximum 3 briefings per hour.",
      recentCount,
    };
  }

  generate();

  return { ok: true, recentCount: recentCount + 1 };
});
