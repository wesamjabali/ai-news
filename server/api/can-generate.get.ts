import { getRecentSummaryCount } from "../database";
import { isHomeRequest } from "../utils/homeCheck";
import { generating } from "../utils/newsEvents";

const MAX_PER_HOUR = 2;

export default defineEventHandler(async (event) => {
  const isHome = await isHomeRequest(event);
  const recentCount = await getRecentSummaryCount();

  return {
    canGenerate: !generating && (isHome || recentCount < MAX_PER_HOUR),
  };
});
