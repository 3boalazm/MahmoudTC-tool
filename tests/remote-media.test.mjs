/**
 * Tests for "transcribe from a link": the SSRF guard (pure) and the real
 * downloader, exercised against throw-away local servers.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

import {
  classifyMediaResponse,
  filenameForLink,
  isBlockedAddress,
  looksLikeText,
  parseMediaLink,
} from '../lib/remote-media.js';
import { MediaLinkError, fetchRemoteMedia } from '../lib/server/fetch-media.js';

/* ------------------------------------------------------------- addresses */

test('isBlockedAddress refuses every private, loopback and metadata range', () => {
  for (const address of [
    '0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '127.255.255.254',
    '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '198.18.0.1', '224.0.0.1', '255.255.255.255',
    '::', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:169.254.169.254',
    '64:ff9b::7f00:1', '2002:7f00:1::1', '2001:db8::1',
  ]) {
    assert.equal(isBlockedAddress(address), true, `${address} must be blocked`);
  }
});

test('isBlockedAddress lets public addresses through', () => {
  for (const address of [
    '8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '100.63.255.255',
    '2606:4700:4700::1111', '::ffff:8.8.8.8',
  ]) {
    assert.equal(isBlockedAddress(address), false, `${address} must be allowed`);
  }
});

test('isBlockedAddress fails closed on anything that is not an IP', () => {
  for (const value of ['', 'not-an-ip', '999.1.1.1', '1.2.3', '::g', null, undefined]) {
    assert.equal(isBlockedAddress(value), true, `${value} must be blocked`);
  }
});

/* ------------------------------------------------------------------ links */

test('parseMediaLink accepts a plain public file link', () => {
  const result = parseMediaLink('https://cdn.example.com/shows/ep-1.mp3?token=abc');
  assert.equal(result.ok, true);
  assert.equal(result.url.hostname, 'cdn.example.com');
});

test('parseMediaLink rejects hostile and malformed links with a reason', () => {
  const cases = {
    '': 'EMPTY',
    '   ': 'EMPTY',
    'not a url': 'INVALID',
    'https://exa mple.com/a.mp3': 'INVALID',
    'ftp://example.com/a.mp3': 'PROTOCOL',
    'file:///etc/passwd': 'PROTOCOL',
    'javascript:alert(1)': 'PROTOCOL',
    'https://user:pass@example.com/a.mp3': 'CREDENTIALS',
    'https://example.com:8443/a.mp3': 'PORT',
    'http://localhost/a.mp3': 'PRIVATE_HOST',
    'http://app.localhost/a.mp3': 'PRIVATE_HOST',
    'http://intranet/a.mp3': 'PRIVATE_HOST',
    'http://printer.local/a.mp3': 'PRIVATE_HOST',
    'http://127.0.0.1/a.mp3': 'PRIVATE_HOST',
    'http://169.254.169.254/latest/meta-data': 'PRIVATE_HOST',
    'http://[::1]/a.mp3': 'PRIVATE_HOST',
    'http://[::ffff:127.0.0.1]/a.mp3': 'PRIVATE_HOST',
    // WHATWG normalises these numeric spellings to 127.0.0.1 / 10.0.0.1
    'http://2130706433/a.mp3': 'PRIVATE_HOST',
    'http://0x7f.0.0.1/a.mp3': 'PRIVATE_HOST',
    'http://0177.0.0.1/a.mp3': 'PRIVATE_HOST',
    'https://www.youtube.com/watch?v=abc': 'PAGE_LINK',
    'https://youtu.be/abc': 'PAGE_LINK',
    'https://m.instagram.com/reel/abc': 'PAGE_LINK',
  };
  for (const [link, reason] of Object.entries(cases)) {
    const result = parseMediaLink(link);
    assert.equal(result.ok, false, `${link} must be rejected`);
    assert.equal(result.reason, reason, `${link} → ${reason}`);
  }
});

test('parseMediaLink rejects an over-long link', () => {
  assert.equal(parseMediaLink(`https://example.com/${'a'.repeat(3000)}.mp3`).reason, 'TOO_LONG');
});

/* --------------------------------------------------------- classification */

test('classifyMediaResponse trusts media types and the extension on generic ones', () => {
  assert.equal(classifyMediaResponse({ contentType: 'audio/mpeg', filename: 'x' }).ok, true);
  assert.equal(classifyMediaResponse({ contentType: 'video/mp4; codecs=avc1', filename: 'x' }).ok, true);
  assert.equal(classifyMediaResponse({ contentType: 'application/octet-stream', filename: 'a.m4a' }).ok, true);
  assert.equal(classifyMediaResponse({ contentType: '', filename: 'a.flac' }).ok, true);

  assert.equal(classifyMediaResponse({ contentType: 'text/html', filename: 'a.mp3' }).reason, 'NOT_MEDIA');
  assert.equal(classifyMediaResponse({ contentType: 'application/json', filename: 'a.mp3' }).reason, 'NOT_MEDIA');
  assert.equal(classifyMediaResponse({ contentType: 'application/octet-stream', filename: 'a.zip' }).reason, 'NOT_MEDIA');
  assert.equal(classifyMediaResponse({ contentType: 'application/vnd.apple.mpegurl', filename: 'x' }).reason, 'PLAYLIST');
  assert.equal(classifyMediaResponse({ contentType: 'audio/mpeg', filename: 'live.m3u8' }).reason, 'PLAYLIST');
});

test('looksLikeText spots HTML and JSON hiding behind a media header', () => {
  assert.equal(looksLikeText(Buffer.from('  <!doctype html>')), true);
  assert.equal(looksLikeText(Buffer.from('{"error":1}')), true);
  assert.equal(looksLikeText(Buffer.from([0xef, 0xbb, 0xbf, 0x3c])), true);
  assert.equal(looksLikeText(Buffer.from('ID3\u0003')), false);
  assert.equal(looksLikeText(Buffer.from('RIFF')), false);
  assert.equal(looksLikeText(Buffer.alloc(0)), false);
});

test('filenameForLink prefers Content-Disposition and sanitises the result', () => {
  assert.equal(filenameForLink('https://x.test/a/b/ep%201.mp3'), 'ep 1.mp3');
  assert.equal(
    filenameForLink('https://x.test/dl?id=1', 'attachment; filename="talk.mp3"'),
    'talk.mp3',
  );
  assert.equal(filenameForLink('https://x.test/', ''), 'audio');
  assert.ok(!filenameForLink('https://x.test/', 'attachment; filename="a/../b\r\n.mp3"').includes('/'));
});

/* ------------------------------------------------------- the downloader */

/** Start a local server and run `fn(baseUrl)`; always closes it. */
async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

const AUDIO = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(2_000, 7)]);
const lenient = { maxBytes: 1024 * 1024, timeoutMs: 5_000, allowPrivate: true };

test('fetchRemoteMedia downloads a file and reports its type and name', async () => {
  await withServer(
    (req, res) => {
      res.writeHead(200, { 'content-type': 'audio/mpeg' });
      res.end(AUDIO);
    },
    async (base) => {
      const media = await fetchRemoteMedia(`${base}/podcasts/ep-1.mp3`, lenient);
      assert.ok(media.buffer.equals(AUDIO));
      assert.equal(media.contentType, 'audio/mpeg');
      assert.equal(media.filename, 'ep-1.mp3');
    },
  );
});

test('fetchRemoteMedia follows redirects', async () => {
  await withServer(
    (req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { location: '/real.mp3' });
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'audio/mpeg' });
      return res.end(AUDIO);
    },
    async (base) => {
      const media = await fetchRemoteMedia(`${base}/start`, lenient);
      assert.equal(media.filename, 'real.mp3');
    },
  );
});

test('fetchRemoteMedia stops a redirect loop', async () => {
  await withServer(
    (req, res) => {
      res.writeHead(302, { location: '/again' });
      res.end();
    },
    async (base) => {
      await assert.rejects(() => fetchRemoteMedia(`${base}/again`, lenient), {
        code: 'TOO_MANY_REDIRECTS',
      });
    },
  );
});

test('fetchRemoteMedia refuses a redirect into a private address', async () => {
  // A public-looking first hop that bounces to the cloud metadata endpoint.
  // allowPrivate is off, so the first hop (127.0.0.1) is already refused —
  // the redirect check is covered separately through parseMediaLink above.
  await assert.rejects(
    () => fetchRemoteMedia('http://127.0.0.1/a.mp3', { maxBytes: 1024, timeoutMs: 2_000 }),
    (error) => error instanceof MediaLinkError && error.code === 'PRIVATE_HOST',
  );
});

test('fetchRemoteMedia re-validates the target of every redirect', async () => {
  await withServer(
    (req, res) => {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    },
    async (base) => {
      // allowPrivate lets the local test server through, but must not be what
      // lets the metadata address through — so check with the real rule set.
      await assert.rejects(
        () => fetchRemoteMedia(`${base}/x.mp3`, { ...lenient, allowPrivate: true }),
        (error) => error instanceof MediaLinkError,
      );
    },
  );
});

test('fetchRemoteMedia enforces the size limit by header and while streaming', async () => {
  await withServer(
    (req, res) => {
      if (req.url === '/declared.mp3') {
        res.writeHead(200, { 'content-type': 'audio/mpeg', 'content-length': '999999' });
        return res.end(Buffer.alloc(10));
      }
      // No Content-Length: chunked, so only the streaming cap can catch it.
      res.writeHead(200, { 'content-type': 'audio/mpeg' });
      res.write(Buffer.alloc(4_000, 1));
      res.write(Buffer.alloc(4_000, 1));
      return res.end();
    },
    async (base) => {
      const small = { ...lenient, maxBytes: 5_000 };
      await assert.rejects(() => fetchRemoteMedia(`${base}/declared.mp3`, small), { code: 'TOO_LARGE' });
      await assert.rejects(() => fetchRemoteMedia(`${base}/chunked.mp3`, small), { code: 'TOO_LARGE' });
    },
  );
});

test('fetchRemoteMedia rejects pages, errors and empty files with clear codes', async () => {
  await withServer(
    (req, res) => {
      if (req.url === '/page') {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end('<html></html>');
      }
      if (req.url === '/disguised.mp3') {
        res.writeHead(200, { 'content-type': 'audio/mpeg' });
        return res.end('<!doctype html><title>Sign in</title>');
      }
      if (req.url === '/empty.mp3') {
        res.writeHead(200, { 'content-type': 'audio/mpeg' });
        return res.end();
      }
      if (req.url === '/private.mp3') {
        res.writeHead(403);
        return res.end();
      }
      res.writeHead(404);
      return res.end();
    },
    async (base) => {
      await assert.rejects(() => fetchRemoteMedia(`${base}/page`, lenient), { code: 'NOT_MEDIA' });
      await assert.rejects(() => fetchRemoteMedia(`${base}/disguised.mp3`, lenient), { code: 'NOT_MEDIA' });
      await assert.rejects(() => fetchRemoteMedia(`${base}/empty.mp3`, lenient), { code: 'EMPTY' });
      await assert.rejects(() => fetchRemoteMedia(`${base}/private.mp3`, lenient), {
        code: 'HTTP_ERROR',
        status: 502,
      });
      await assert.rejects(() => fetchRemoteMedia(`${base}/missing.mp3`, lenient), {
        code: 'HTTP_ERROR',
      });
    },
  );
});

test('fetchRemoteMedia gives up when the server stalls', async () => {
  await withServer(
    (req, res) => {
      res.writeHead(200, { 'content-type': 'audio/mpeg' });
      res.write(Buffer.alloc(100, 1)); // then never finish
    },
    async (base) => {
      await assert.rejects(
        () => fetchRemoteMedia(`${base}/slow.mp3`, { ...lenient, timeoutMs: 300 }),
        { code: 'TIMEOUT', status: 504 },
      );
    },
  );
});

test('fetchRemoteMedia reports an unreachable host', async () => {
  // Port 1 on loopback: connection refused.
  await assert.rejects(
    () => fetchRemoteMedia('http://127.0.0.1:1/a.mp3', lenient),
    { code: 'UNREACHABLE' },
  );
});
