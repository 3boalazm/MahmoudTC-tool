/**
 * lib/server/fetch-media.js
 * ---------------------------------------------------------------------------
 * Download audio/video from a pasted link, safely.
 *
 * Why a hand-rolled client instead of `fetch`: the SSRF check has to apply to
 * the address we actually connect to. Resolving a name, checking it, and then
 * letting `fetch` resolve it *again* leaves a window for DNS rebinding. Here the
 * check lives inside the socket's `lookup`, so the address that was validated is
 * the one that gets dialled.
 *
 * Defences, in order
 *   1. plain http(s) on the default port, no credentials, no internal names
 *   2. every resolved address must be public (checked at connect time)
 *   3. every redirect hop is re-validated, and there are at most 3
 *   4. the body is capped (by Content-Length up front, and while streaming)
 *   5. one wall-clock deadline covers connect, headers and body
 *   6. the response must look like audio/video, not a web page
 */

import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';

import {
  classifyMediaResponse,
  filenameForLink,
  isBlockedAddress,
  looksLikeText,
  parseMediaLink,
} from '../remote-media.js';

const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Failure with a stable code and the HTTP status the API should answer with. */
export class MediaLinkError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'MediaLinkError';
    this.code = code;
    this.status = status;
  }
}

const REASON_MESSAGES = {
  EMPTY: 'Paste a link to an audio or video file.',
  TOO_LONG: 'That link is too long.',
  INVALID: 'That does not look like a valid link.',
  PROTOCOL: 'Only http:// and https:// links are supported.',
  CREDENTIALS: 'Links that contain a username or password are not supported.',
  PORT: 'Only links on the standard web ports are supported.',
  PRIVATE_HOST: 'That link points to a private or internal address, which cannot be fetched.',
  PAGE_LINK:
    'That is a web page (YouTube, Instagram, …), not a media file. Paste a direct link to an audio or video file, such as one ending in .mp3 or .mp4.',
};

/** `lookup` that refuses to connect to a non-public address. */
function publicOnlyLookup(allowPrivate) {
  return (hostname, options, callback) => {
    const done = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? {} : options;

    dns.lookup(hostname, { ...opts, all: true, verbatim: true }, (error, addresses) => {
      if (error) return done(error);
      const blocked = !allowPrivate && addresses.some(({ address }) => isBlockedAddress(address));
      if (!addresses.length || blocked) {
        return done(
          new MediaLinkError('PRIVATE_HOST', REASON_MESSAGES.PRIVATE_HOST, 400),
        );
      }
      // Node asks for `all: true` when it races address families.
      if (opts.all) return done(null, addresses);
      return done(null, addresses[0].address, addresses[0].family);
    });
  };
}

function open(url, { headers, lookup, deadline, onTimeout }) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(
      url,
      { method: 'GET', headers, lookup, agent: false },
      resolve,
    );
    request.on('error', reject);
    deadline.add(() => request.destroy(onTimeout()));
    request.end();
  });
}

/** One timer shared by every phase, so a slow server cannot stretch the budget. */
function createDeadline(timeoutMs) {
  const callbacks = [];
  const timer = setTimeout(() => {
    for (const callback of callbacks) callback();
  }, timeoutMs);
  return {
    add: (callback) => callbacks.push(callback),
    clear: () => clearTimeout(timer),
  };
}

/**
 * @param {string} link
 * @param {{ maxBytes: number, timeoutMs?: number, allowPrivate?: boolean }} options
 *   `allowPrivate` is for tests and local development; callers must never derive
 *   it from request data.
 * @returns {Promise<{ buffer: Buffer, contentType: string, filename: string, finalUrl: string }>}
 * @throws {MediaLinkError}
 */
export async function fetchRemoteMedia(link, { maxBytes, timeoutMs = 30_000, allowPrivate = false }) {
  const first = parseMediaLink(link, { allowPrivate });
  if (!first.ok) {
    throw new MediaLinkError(first.reason, REASON_MESSAGES[first.reason] ?? REASON_MESSAGES.INVALID);
  }

  const lookup = publicOnlyLookup(allowPrivate);
  const deadline = createDeadline(timeoutMs);
  const onTimeout = () =>
    new MediaLinkError('TIMEOUT', 'The link took too long to download. Try a smaller file.', 504);

  let current = first.url;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      let response;
      try {
        response = await open(current, {
          lookup,
          deadline,
          onTimeout,
          headers: {
            'user-agent': 'Mozilla/5.0 (compatible; SpeechToTextStudio/1.0)',
            accept: 'audio/*,video/*;q=0.9,application/octet-stream;q=0.8,*/*;q=0.5',
            'accept-encoding': 'identity',
          },
        });
      } catch (error) {
        if (error instanceof MediaLinkError) throw error;
        throw new MediaLinkError(
          'UNREACHABLE',
          'Could not reach that link. Check the address and that the file is public.',
          502,
        );
      }

      /* ---- redirects: validate the next hop exactly like the first ---- */
      if (REDIRECT_STATUSES.has(response.statusCode) && response.headers.location) {
        response.resume();
        if (hop === MAX_REDIRECTS) {
          throw new MediaLinkError('TOO_MANY_REDIRECTS', 'That link redirects too many times.', 400);
        }
        let next;
        try {
          next = new URL(response.headers.location, current).toString();
        } catch {
          throw new MediaLinkError('INVALID', REASON_MESSAGES.INVALID);
        }
        const parsed = parseMediaLink(next, { allowPrivate });
        if (!parsed.ok) {
          throw new MediaLinkError(parsed.reason, REASON_MESSAGES[parsed.reason] ?? REASON_MESSAGES.INVALID);
        }
        current = parsed.url;
        continue;
      }

      return await readMedia(response, current, { maxBytes, deadline, onTimeout });
    }
    throw new MediaLinkError('TOO_MANY_REDIRECTS', 'That link redirects too many times.', 400);
  } finally {
    deadline.clear();
  }
}

async function readMedia(response, url, { maxBytes, deadline, onTimeout }) {
  const { statusCode, headers } = response;

  if (statusCode < 200 || statusCode >= 300) {
    response.resume();
    const message =
      statusCode === 401 || statusCode === 403
        ? 'That link needs a sign-in or does not allow downloads.'
        : statusCode === 404 || statusCode === 410
          ? 'That link was not found (the file may have been removed).'
          : `That link answered with an error (HTTP ${statusCode}).`;
    throw new MediaLinkError('HTTP_ERROR', message, 502);
  }

  const contentType = String(headers['content-type'] || '');
  const filename = filenameForLink(url, headers['content-disposition']);
  const kind = classifyMediaResponse({ contentType, filename });
  if (!kind.ok) {
    response.resume();
    throw new MediaLinkError(
      kind.reason,
      kind.reason === 'PLAYLIST'
        ? 'That is a streaming playlist (.m3u8 / .mpd), not a single file. Paste a direct link to the audio or video file.'
        : 'That link does not point to an audio or video file. Paste a direct link, such as one ending in .mp3 or .mp4.',
      415,
    );
  }

  const declared = Number(headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) {
    response.resume();
    throw tooLarge(maxBytes);
  }

  const chunks = [];
  let received = 0;

  await new Promise((resolve, reject) => {
    // Settle first, then destroy: destroying emits 'error'/'aborted' straight
    // away, and the first rejection is the one that is reported.
    deadline.add(() => {
      reject(onTimeout());
      response.destroy();
    });
    response.on('data', (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(tooLarge(maxBytes));
        response.destroy();
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', resolve);
    response.on('error', () =>
      reject(new MediaLinkError('UNREACHABLE', 'The download was interrupted. Try again.', 502)),
    );
    response.on('aborted', () =>
      reject(new MediaLinkError('UNREACHABLE', 'The download was interrupted. Try again.', 502)),
    );
  });

  const buffer = Buffer.concat(chunks);
  if (!buffer.length) {
    throw new MediaLinkError('EMPTY', 'That link returned an empty file.', 400);
  }
  if (looksLikeText(buffer)) {
    throw new MediaLinkError(
      'NOT_MEDIA',
      'That link returned a web page or text, not audio or video. Paste a direct link to the file.',
      415,
    );
  }

  return { buffer, contentType, filename, finalUrl: url.toString() };
}

function tooLarge(maxBytes) {
  return new MediaLinkError(
    'TOO_LARGE',
    `That file is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB limit for links.`,
    413,
  );
}
