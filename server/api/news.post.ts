import { getRecentSummaryCount } from "../database";
import { generating } from "../utils/newsEvents";
import { generate } from "./news.get";

export default defineEventHandler(async (event) => {
  const {
    public: { maxUpdates },
  } = useRuntimeConfig(event);

  if (generating) {
    setResponseStatus(event, 429);
    return { error: "A briefing is already being generated." };
  }

  const recentCount = await getRecentSummaryCount();
  if (recentCount >= maxUpdates) {
    setResponseStatus(event, 429);
    return {
      error: `Rate limit reached. Maximum ${maxUpdates} briefings per hour.`,
      recentCount,
    };
  }

  generate();

  return { ok: true, recentCount: recentCount + 1 };
});
