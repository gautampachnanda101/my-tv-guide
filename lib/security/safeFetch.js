/**
 * Fetching user-supplied URLs server-side (stream proxy, stream check,
 * playlist loader) without letting them reach this server's own network.
 *
 * A hostname-string check alone is not enough: a public domain can resolve
 * to 127.0.0.1, IPs can be written as "2130706433" or "0x7f.1", and a public
 * URL can redirect to an internal one. So every hop's hostname is resolved
 * and each resulting address checked, and redirects are followed manually.
 *
 * Remaining gap: fetch() resolves the hostname again itself, so a DNS
 * record that changes between the check and the request (DNS rebinding)
 * isn't caught. Acceptable here - there's nothing internal to reach on a
 * Vercel function beyond the metadata ranges blocked below.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 5;

function isPrivateIPv4(address) {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast + reserved
  );
}

function isPrivateIPv6(address) {
  const ip = address.toLowerCase();
  if (ip === "::" || ip === "::1") return true;
  // IPv4-mapped (::ffff:10.0.0.1) - judge by the embedded IPv4 address.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  // WHATWG URL rewrites that form to hex: [::ffff:169.254.169.254] becomes
  // [::ffff:a9fe:a9fe] - decode it back to dotted IPv4.
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    return isPrivateIPv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  return /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith("ff"); // ULA, link-local, multicast
}

function isPrivateAddress(address) {
  const version = isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version === 6) return isPrivateIPv6(address);
  return true;
}

/**
 * Parses `raw` and confirms it's an http(s) URL whose host resolves only to
 * public addresses. Returns the URL, or null if it's invalid or internal.
 */
export async function resolvePublicUrl(raw, options = {}) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // URL normalises "2130706433" / "0x7f.1" to dotted IPv4 already.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return null;
  }

  if (isIP(host)) return isPrivateAddress(host) ? null : url;

  let addresses;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch (error) {
    // A hostname that doesn't resolve isn't unsafe, it's dead - callers
    // tell users "this server no longer exists" rather than "invalid URL".
    if (options.throwOnMissingHost && (error.code === "ENOTFOUND" || error.code === "EAI_NONAME")) {
      throw new HostNotFoundError(`Host not found: ${host}`);
    }
    return null;
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) return null;
  return url;
}

export class UnsafeUrlError extends Error {}

// The URL is well-formed and public, but its hostname has no DNS record -
// almost always a stream whose server has been shut down.
export class HostNotFoundError extends Error {}

/**
 * fetch() that validates the initial URL and every redirect hop with
 * resolvePublicUrl. Throws UnsafeUrlError for a blocked URL or too many
 * redirects; network errors propagate as usual.
 */
export async function safeFetch(raw, init = {}) {
  let url = await resolvePublicUrl(raw, { throwOnMissingHost: true });
  if (!url) throw new UnsafeUrlError("Unsupported or internal URL");

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(url, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) {
      return Object.assign(response, { finalUrl: url });
    }

    response.body?.cancel();
    url = await resolvePublicUrl(new URL(location, url).toString(), { throwOnMissingHost: true });
    if (!url) throw new UnsafeUrlError("Redirected to an unsupported or internal URL");
  }
  throw new UnsafeUrlError("Too many redirects");
}
