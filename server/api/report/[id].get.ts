import { getSummaryById } from "../../database";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id) || id <= 0) {
    setResponseStatus(event, 400);
    return { error: "Invalid report ID" };
  }

  const summary = await getSummaryById(id);
  if (!summary) {
    setResponseStatus(event, 404);
    return { error: "Report not found" };
  }

  return summary;
});
