import { getRecentSummaryCount } from "../database";
import { generating } from "../utils/newsEvents";
import { generate } from "./news.get";

export default defineEventHandler(async (event) => {
  const {
    public: { maxUpdates, updateWindowHours },
  } = useRuntimeConfig(event);

  if (generating) {
    setResponseStatus(event, 429);
    return { error: "A briefing is already being generated." };
  }

  const windowMinutes = updateWindowHours * 60;
  const recentCount = await getRecentSummaryCount(windowMinutes);
  if (recentCount >= maxUpdates) {
    setResponseStatus(event, 429);
    return {
      error: `Rate limit reached. Maximum ${maxUpdates} briefings per ${updateWindowHours} hour${updateWindowHours === 1 ? "" : "s"}.`,
      recentCount,
    };
  }

  generate();

  return { ok: true, recentCount: recentCount + 1 };
});
