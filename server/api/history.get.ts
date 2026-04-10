import { getAllSummaries } from "../database";

export default defineEventHandler(async () => {
  const summaries = await getAllSummaries();
  return { summaries };
});
