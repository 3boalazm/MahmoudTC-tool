/**
 * lib/remote-media.js
 * ---------------------------------------------------------------------------
 * Pure helpers for the "transcribe from a link" input: decide whether a
 * caller-supplied URL may be downloaded by the server, and whether what came
 * back looks like audio or video.
 *
 * Unlike `lib/url-guard.js` (which only lets our own Blob store through), a
 * pasted link can point anywhere on the internet — so this is the SSRF line.
 * It refuses everything that is not a plain public http(s) URL on a default
 * port, and `isBlockedAddress` is applied again to every address the hostname
 * resolves to (see lib/server/fetch-media.js), which is what defeats DNS tricks
 * that a string check alone cannot.
 *
 * Dependency-free (no Node built-ins) so it is unit-testable and importable
 * from the browser for early, friendly validation.
 */

/** Hard cap so a pathological URL cannot bloat logs or headers. */
export const MAX_LINK_LENGTH = 2_048;

/** File extensions the engines accept. Shared with /api/transcribe. */
export const MEDIA_EXTENSIONS = [
  'mp3', 'mpga', 'wav', 'wave', 'm4a', 'mp4', 'mpeg', 'webm', 'ogg', 'oga',
  'opus', 'flac', 'aac', 'amr', 'aiff', 'aif', '3gp', '3gpp', 'mkv', 'mov',
];

/** Content types that are clearly media. */
const MEDIA_TYPE = /^(audio|video)\//i;
const ALSO_MEDIA_TYPES = new Set(['application/ogg', 'application/x-ogg']);
/** Types that say "bytes, unknown kind" — judged by the file extension instead. */
const GENERIC_TYPES = new Set(['application/octet-stream', 'binary/octet-stream', '']);
/** Streaming playlists point at segments; they are not a single file. */
const PLAYLIST_TYPES = /mpegurl|dash\+xml/i;

/**
 * Sites whose links are web *pages*, not files. Downloading one returns HTML,
 * so we say so up front instead of failing after a round trip.
 */
const PAGE_HOSTS = [
  'youtube.com', 'youtu.be', 'youtube-nocookie.com', 'instagram.com', 'tiktok.com',
  'facebook.com', 'fb.watch', 'twitter.com', 'x.com', 'vimeo.com', 'twitch.tv',
  'soundcloud.com', 'spotify.com', 'dailymotion.com', 'reddit.com',
];

const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

/** True for hosts that serve a web page rather than a downloadable file. */
export function isPageHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return PAGE_HOSTS.some((domain) => hostMatches(host, domain));
}

/** Names that never belong to the public internet. */
const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.intranet', '.home.arpa'];

/* -------------------------------------------------------------------------- */
/* IP address classification                                                  */
/* -------------------------------------------------------------------------- */

function parseIPv4(text) {
  const parts = String(text).split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  return octets.every((n) => n >= 0 && n <= 255) ? octets : null;
}

/** [a, b, c, d] is inside `base/bits`. */
function inCidr4(octets, base, bits) {
  const toInt = (o) => ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (toInt(octets) & mask) === (toInt(base) & mask);
}

const BLOCKED_V4 = [
  [[0, 0, 0, 0], 8], // "this" network
  [[10, 0, 0, 0], 8], // private
  [[100, 64, 0, 0], 10], // carrier-grade NAT
  [[127, 0, 0, 0], 8], // loopback
  [[169, 254, 0, 0], 16], // link-local, incl. cloud metadata 169.254.169.254
  [[172, 16, 0, 0], 12], // private
  [[192, 0, 0, 0], 24], // IETF protocol assignments
  [[192, 0, 2, 0], 24], // documentation
  [[192, 88, 99, 0], 24], // 6to4 relay
  [[192, 168, 0, 0], 16], // private
  [[198, 18, 0, 0], 15], // benchmarking
  [[198, 51, 100, 0], 24], // documentation
  [[203, 0, 113, 0], 24], // documentation
  [[224, 0, 0, 0], 4], // multicast
  [[240, 0, 0, 0], 4], // reserved + broadcast
];

function isBlockedIPv4(octets) {
  return BLOCKED_V4.some(([base, bits]) => inCidr4(octets, base, bits));
}

/** Expand any IPv6 text (including `::` and a trailing dotted quad) to 8 hextets. */
function parseIPv6(text) {
  let value = String(text).toLowerCase().replace(/^\[|\]$/g, '');
  const zone = value.indexOf('%');
  if (zone !== -1) value = value.slice(0, zone);

  const dotted = value.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const v4 = parseIPv4(dotted[1]);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    value = `${value.slice(0, -dotted[1].length)}${hi}:${lo}`;
  }

  const halves = value.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function isBlockedIPv6(h) {
  // :: and ::1
  if (h.slice(0, 7).every((x) => x === 0) && (h[7] === 0 || h[7] === 1)) return true;

  const embedded = (a, b) => [a >> 8, a & 0xff, b >> 8, b & 0xff];

  // ::ffff:a.b.c.d (IPv4-mapped) and ::a.b.c.d (IPv4-compatible)
  if (h.slice(0, 5).every((x) => x === 0) && (h[5] === 0xffff || h[5] === 0)) {
    return isBlockedIPv4(embedded(h[6], h[7]));
  }
  // 64:ff9b::/96 (NAT64) carries an IPv4 address in its last 32 bits
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
    return isBlockedIPv4(embedded(h[6], h[7]));
  }
  // 2002::/16 (6to4) carries one right after the prefix
  if (h[0] === 0x2002) return isBlockedIPv4(embedded(h[1], h[2]));
  // 2001::/32 Teredo, 2001:db8::/32 documentation
  if (h[0] === 0x2001 && (h[1] === 0 || h[1] === 0x0db8)) return true;

  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
  if ((h[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

/**
 * True when `address` must never be contacted on a caller's behalf: loopback,
 * private, link-local (cloud metadata), multicast, reserved, or anything that
 * does not parse as an IP at all (fail closed).
 */
export function isBlockedAddress(address) {
  const text = String(address ?? '').trim();
  const v4 = parseIPv4(text);
  if (v4) return isBlockedIPv4(v4);
  const v6 = text.includes(':') ? parseIPv6(text) : null;
  if (v6) return isBlockedIPv6(v6);
  return true;
}

/** Whether a string is an IP literal (v4 or v6). */
export function isIpLiteral(host) {
  const text = String(host ?? '').replace(/^\[|\]$/g, '');
  return Boolean(parseIPv4(text)) || (text.includes(':') && Boolean(parseIPv6(text)));
}

/* -------------------------------------------------------------------------- */
/* URL validation                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Validate a pasted link without touching the network.
 *
 * @param {unknown} value
 * @param {{ allowPrivate?: boolean }} [options] `allowPrivate` exists for tests
 *        and local development only — it is never fed from a request.
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 *   `reason` is one of: EMPTY, TOO_LONG, INVALID, PROTOCOL, CREDENTIALS, PORT,
 *   PRIVATE_HOST, PAGE_LINK
 */
export function parseMediaLink(value, { allowPrivate = false } = {}) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { ok: false, reason: 'EMPTY' };
  if (raw.length > MAX_LINK_LENGTH) return { ok: false, reason: 'TOO_LONG' };
  // Reject before parsing: URL() silently repairs some malformed inputs.
  if (/[\s\\]/.test(raw)) return { ok: false, reason: 'INVALID' };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'INVALID' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'PROTOCOL' };
  }
  if (url.username || url.password) return { ok: false, reason: 'CREDENTIALS' };
  // `URL` drops the scheme's default port, so any port left is a non-standard one.
  if (url.port && !allowPrivate) return { ok: false, reason: 'PORT' };

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!allowPrivate) {
    if (isIpLiteral(host)) {
      if (isBlockedAddress(host)) return { ok: false, reason: 'PRIVATE_HOST' };
    } else if (
      !host.includes('.') ||
      host === 'localhost' ||
      PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))
    ) {
      return { ok: false, reason: 'PRIVATE_HOST' };
    }
  }

  if (isPageHost(host)) return { ok: false, reason: 'PAGE_LINK' };
  return { ok: true, url };
}

/* -------------------------------------------------------------------------- */
/* Response classification                                                    */
/* -------------------------------------------------------------------------- */

/** Lower-cased media type without parameters: `audio/mpeg; charset=…` → `audio/mpeg`. */
export function baseContentType(header) {
  return String(header ?? '').split(';')[0].trim().toLowerCase();
}

/** Extension of a file name, lower-cased, or ''. */
export function extensionOf(name) {
  const clean = String(name ?? '').split(/[?#]/)[0];
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
}

/**
 * Decide whether a downloaded response is audio/video.
 *
 * @returns {{ ok: true } | { ok: false, reason: 'NOT_MEDIA' | 'PLAYLIST' }}
 */
export function classifyMediaResponse({ contentType, filename }) {
  const type = baseContentType(contentType);
  if (PLAYLIST_TYPES.test(type) || ['m3u8', 'm3u', 'mpd'].includes(extensionOf(filename))) {
    return { ok: false, reason: 'PLAYLIST' };
  }
  if (MEDIA_TYPE.test(type) || ALSO_MEDIA_TYPES.has(type)) return { ok: true };
  if (GENERIC_TYPES.has(type) && MEDIA_EXTENSIONS.includes(extensionOf(filename))) {
    return { ok: true };
  }
  return { ok: false, reason: 'NOT_MEDIA' };
}

/** The first bytes of an HTML/JSON/XML page — never audio, whatever the headers claim. */
export function looksLikeText(bytes) {
  if (!bytes?.length) return false;
  let i = 0;
  // Skip a UTF-8 BOM and leading whitespace.
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3;
  while (i < bytes.length && [0x20, 0x09, 0x0a, 0x0d].includes(bytes[i])) i += 1;
  return bytes[i] === 0x3c /* < */ || bytes[i] === 0x7b /* { */ || bytes[i] === 0x5b; /* [ */
}

/** A tame file name for a link: the last path segment, or the Content-Disposition name. */
export function filenameForLink(url, contentDisposition = '', fallback = 'audio') {
  const disposition = String(contentDisposition || '');
  const encoded = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  let raw = encoded?.[1] ?? plain?.[1] ?? '';
  try {
    raw = raw ? decodeURIComponent(raw.trim()) : '';
  } catch {
    raw = raw.trim();
  }
  if (!raw) {
    try {
      raw = decodeURIComponent(new URL(String(url)).pathname.split('/').pop() || '');
    } catch {
      raw = '';
    }
  }
  return raw.replace(/[^\p{L}\p{N}_.\- ]+/gu, '_').slice(-120) || fallback;
}
