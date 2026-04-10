import { getAllSummaries } from "../database";

export default defineEventHandler(() => {
  const summaries = getAllSummaries();
  return { summaries };
});
