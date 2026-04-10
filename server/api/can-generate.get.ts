import { getRecentSummaryCount } from "../database";
import { generating } from "../utils/newsEvents";

export default defineEventHandler(async (event) => {
  const {
    public: { maxUpdates },
  } = useRuntimeConfig(event);
  const recentCount = await getRecentSummaryCount();

  return {
    canGenerate: !generating && recentCount < maxUpdates,
  };
});
