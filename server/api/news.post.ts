import { resolve } from "dns/promises";
import { getRecentSummaryCount } from "../database";
import { generating } from "../utils/newsEvents";
import { generate } from "./news.get";

const MAX_PER_HOUR = 2;

let _homeIps: { ips: Set<string>; expires: number } | null = null;

async function getHomeIps(): Promise<Set<string>> {
  if (_homeIps && Date.now() < _homeIps.expires) return _homeIps.ips;
  try {
    const addresses = await resolve("ddns.wesamjabali.com");
    const ips = new Set(addresses);
    _homeIps = { ips, expires: Date.now() + 5 * 60 * 1000 };
    return ips;
  } catch {
    return _homeIps?.ips ?? new Set();
  }
}

export default defineEventHandler(async (event) => {
  if (generating) {
    setResponseStatus(event, 429);
    return { error: "A briefing is already being generated." };
  }

  const clientIp = getRequestIP(event, { xForwardedFor: true });
  const homeIps = await getHomeIps();
  const isHome = !!clientIp && homeIps.has(clientIp);

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
