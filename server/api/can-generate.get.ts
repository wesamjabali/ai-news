import { getRecentSummaryCount } from "../database";
import { generating } from "../utils/newsEvents";

const MAX_PER_HOUR = 2;

export default defineEventHandler(async () => {
  const recentCount = await getRecentSummaryCount();

  return {
    canGenerate: !generating && recentCount < MAX_PER_HOUR,
  };
});
