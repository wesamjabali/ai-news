import { resolve } from "dns/promises";
import type { H3Event } from "h3";

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

export async function isHomeRequest(event: H3Event): Promise<boolean> {
  if (import.meta.dev) return true;
  const clientIp = getRequestIP(event);
  if (!clientIp) return false;
  const homeIps = await getHomeIps();
  return homeIps.has(clientIp);
}
