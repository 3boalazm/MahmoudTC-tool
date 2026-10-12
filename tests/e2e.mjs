/**
 * tests/e2e.mjs  ·  `npm run build && npm run test:e2e`
 * ---------------------------------------------------------------------------
 * End-to-end verification of the real request path:
 *
 *   HTTP client → `next start` → /api/transcribe → mock Deepgram / Gladia /
 *   AssemblyAI / Speechmatics
 *
 * It boots the production build with fake-but-valid-looking keys and mock
 * provider endpoints, then asserts the documented fallback contract:
 *   429, 402, 401, 5xx and empty transcripts must hand off to the next engine;
 *   the whole chain failing must produce a structured error; bad requests must
 *   be rejected before any engine is called; /api/usage must report per-engine
 *   consumption without inventing figures a provider does not expose.
 */

import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  startAssemblyAIMock,
  startDeepgramMock,
  startGladiaMock,
  startSpeechmaticsMock,
} from './mock-providers.mjs';

/** Vercel rejects any serverless request body above this. */
const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024;

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* ------------------------------------------------------------- tiny runner */

let passed = 0;
const failures = [];

async function scenario(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`  ✗ ${name}`);
    console.log(`      ${error.message.split('\n').join('\n      ')}`);
  }
}

/* ------------------------------------------------------------ test material */

/** One second of 16-bit mono PCM wrapped in a valid WAV container. */
function makeWav(seconds = 1, sampleRate = 16_000) {
  const samples = seconds * sampleRate;
  const data = Buffer.alloc(samples * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const wav = makeWav(1);

async function waitForServer(url, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function startApp({
  deepgramBase,
  gladiaBase,
  assemblyaiBase,
  speechmaticsBase,
  extraEnv = {},
  simulateVercel = false,
  omitEnv = [],
}) {
  const port = 4000 + Math.floor(Math.random() * 900);
  const baseEnv = {
    NODE_ENV: 'production',
    DEEPGRAM_API_KEY: 'test-deepgram-key',
    GLADIA_API_KEY: 'test-gladia-key',
    ASSEMBLYAI_API_KEY: 'test-assemblyai-key',
    SPEECHMATICS_API_KEY: 'test-speechmatics-key',
    DEEPGRAM_BASE_URL: deepgramBase,
    GLADIA_BASE_URL: gladiaBase,
    ASSEMBLYAI_BASE_URL: assemblyaiBase,
    SPEECHMATICS_BASE_URL: speechmaticsBase,
    DEEPGRAM_TIMEOUT_MS: '8000',
    GLADIA_POLL_INTERVAL_MS: '150',
    GLADIA_POLL_TIMEOUT_MS: '8000',
    ASSEMBLYAI_POLL_INTERVAL_MS: '150',
    ASSEMBLYAI_POLL_TIMEOUT_MS: '8000',
    SPEECHMATICS_POLL_INTERVAL_MS: '150',
    SPEECHMATICS_POLL_TIMEOUT_MS: '8000',
    MAX_UPLOAD_MB: '2',
    RATE_LIMIT_MAX: '500',
    ...extraEnv,
  };
  for (const key of omitEnv) delete baseEnv[key];
  const child = spawn('npx', ['next', 'start', '--port', String(port)], {
    cwd: root,
    // Own process group, so a single kill takes the whole `npx` → `next-server`
    // tree with it and a crash can never leak servers onto the machine.
    detached: true,
    env: {
      ...process.env,
      ...baseEnv,
      // Flip the deployment-detection flag and emulate the platform's request
      // body cap so the serverless behaviour can be exercised locally.
      ...(simulateVercel
        ? { VERCEL: '1', VERCEL_ENV: 'preview', FUNCTION_BUDGET_MS: '20000' }
        : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logs = [];
  child.stdout.on('data', (chunk) => logs.push(chunk.toString()));
  child.stderr.on('data', (chunk) => logs.push(chunk.toString()));

  // A proxy in front of the app that mimics Vercel's platform limits.
  const guard = simulateVercel ? await startBodyLimitGuard(port) : null;
  const base = guard ? guard.url : `http://127.0.0.1:${port}`;
  try {
    await waitForServer(`${base}/api/health`);
  } catch (error) {
    child.kill('SIGKILL');
    throw new Error(`${error.message}\n${logs.join('')}`);
  }

  /** Kill the whole child process group, guard first. */
  const shutdown = async () => {
    await guard?.close().catch(() => {});
    if (child.exitCode !== null || child.signalCode) return;
    await new Promise((resolve) => {
      const force = setTimeout(() => {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          /* already gone */
        }
        resolve();
      }, 2_000);
      child.once('exit', () => {
        clearTimeout(force);
        resolve();
      });
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        resolve();
      }
    });
  };

  running.push(shutdown);

  return { base, close: shutdown };
}

/**
 * Minimal proxy that behaves like Vercel's edge: request bodies above 4.5 MB are
 * rejected with a platform 413 *before* the function runs. Buffering the body is
 * fine here because this only ever exists during tests.
 */
async function startBodyLimitGuard(targetPort) {
  const { createServer } = await import('node:http');

  const server = createServer(async (request, response) => {
    const chunks = [];
    let total = 0;
    let rejected = false;

    await new Promise((resolve) => {
      request.on('data', (chunk) => {
        if (rejected) return; // already answered; drain the rest silently
        total += chunk.length;
        if (total > VERCEL_BODY_LIMIT) {
          rejected = true;
          response.writeHead(413, { 'content-type': 'application/json' });
          response.end(
            JSON.stringify({
              error: {
                code: 'FUNCTION_PAYLOAD_TOO_LARGE',
                message: 'Request body exceeds 4.5 MB.',
              },
            }),
          );
          resolve();
          return;
        }
        chunks.push(chunk);
      });
      request.on('end', resolve);
      request.on('error', resolve);
    });

    if (rejected) return;

    // The app may still be booting while the readiness probe polls us.
    let upstream;
    try {
      upstream = await fetch(`http://127.0.0.1:${targetPort}${request.url}`, {
        method: request.method,
        headers: { ...request.headers, host: `127.0.0.1:${targetPort}` },
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.concat(chunks),
        redirect: 'manual',
      });
    } catch {
      return json(response, 503, { error: { code: 'UPSTREAM_UNAVAILABLE' } });
    }

    const headers = {};
    upstream.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'content-length') headers[key] = value;
    });
    response.writeHead(upstream.status, headers);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

/** Point the blob-upload route at a mock Blob store on the Vercel side. */
async function startBlobMock() {
  const { createServer } = await import('node:http');

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);

    if (url.pathname === '/v1/upload') {
      return json(response, 200, {
        url: `https://mock123.public.blob.vercel-storage.com/stt-uploads/clip.webm`,
        downloadUrl: `https://mock123.public.blob.vercel-storage.com/stt-uploads/clip.webm`,
        pathname: 'stt-uploads/clip.webm',
        contentType: 'audio/webm',
      });
    }

    if (url.pathname === '/v1/delete') {
      return json(response, 200, { deleted: true });
    }

    return json(response, 404, { message: `unhandled ${url.pathname}` });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

/**
 * POST a clip to the proxy. Provider behaviour is configured on the mocks
 * beforehand with `setMode`, because the app intentionally forwards nothing
 * from the client request to the providers.
 */
async function transcribe(base, { audio = wav, filename = 'clip.wav', type = 'audio/wav', fields = {} } = {}) {
  const form = new FormData();
  form.append('audio', new Blob([audio], { type }), filename);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  const response = await fetch(`${base}/api/transcribe`, { method: 'POST', body: form });
  return { status: response.status, body: await response.json().catch(() => null) };
}

/** Track every spawned app so an unexpected exit still cleans up. */
const running = [];
let teardownStarted = false;
async function teardownAll() {
  if (teardownStarted) return;
  teardownStarted = true;
  await Promise.all(running.map((shutdown) => shutdown().catch(() => {})));
}
process.on('exit', () => {
  for (const shutdown of running) {
    try {
      shutdown();
    } catch {
      /* synchronous best effort */
    }
  }
});
process.on('uncaughtException', async (error) => {
  await teardownAll();
  console.error(error);
  process.exit(1);
});
process.on('unhandledRejection', async (error) => {
  await teardownAll();
  console.error(error);
  process.exit(1);
});
process.on('SIGINT', async () => {
  await teardownAll();
  process.exit(130);
});

/** Point each mock at a scenario, waiting until the mock acknowledges it. */
async function setModes({
  deepgram = 'ok',
  gladia = 'ok',
  assemblyai = 'ok',
  speechmatics = 'ok',
} = {}) {
  await deepgramMock.setMode(deepgram);
  await gladiaMock.setMode(gladia);
  await assemblyaiMock.setMode(assemblyai);
  await speechmaticsMock.setMode(speechmatics);
}

/* ---------------------------------------------------------------------- main */

const deepgramMock = await startDeepgramMock();
const gladiaMock = await startGladiaMock();
const assemblyaiMock = await startAssemblyAIMock();
const speechmaticsMock = await startSpeechmaticsMock();

if (!existsSync(path.join(root, '.next', 'BUILD_ID'))) {
  console.error('\nNo production build found. Run `npm run build` first.\n');
  await Promise.all([
    deepgramMock.close(),
    gladiaMock.close(),
    assemblyaiMock.close(),
    speechmaticsMock.close(),
  ]);
  process.exit(1);
}

console.log(
  `\nMocks ready — deepgram ${deepgramMock.url}, gladia ${gladiaMock.url}, ` +
    `assemblyai ${assemblyaiMock.url}, speechmatics ${speechmaticsMock.url}`,
);
const app = await startApp({
  deepgramBase: `${deepgramMock.url}/v1/listen`,
  gladiaBase: `${gladiaMock.url}/v2`,
  assemblyaiBase: assemblyaiMock.url,
  speechmaticsBase: speechmaticsMock.url,
});
console.log(`App ready at ${app.base}\n`);

console.log('Health & validation');
await scenario('GET /api/health reports every engine as available, in order', async () => {
  const response = await fetch(`${app.base}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);

  const ids = body.engines.map((engine) => engine.id);
  assert.deepEqual(ids, ['deepgram', 'gladia', 'assemblyai', 'speechmatics']);
  for (const engine of body.engines) {
    assert.equal(engine.available, true, `${engine.id} should be keyed`);
  }
  assert.deepEqual(body.engineOrder, ids);
  assert.equal(body.engines[0].model, 'nova-2');
  assert.equal(body.engines[0].role, 'primary');
  assert.equal(body.engines[3].model, 'enhanced');
  assert.equal(body.engines[3].supportsRemoteUrl, false);
  assert.equal(body.limits.maxUploadMb, 2);
  assert.equal(body.features.usagePanel, true);
});

await scenario('rejects a request with no audio field', async () => {
  const form = new FormData();
  form.append('note', 'no audio here');
  const response = await fetch(`${app.base}/api/transcribe`, { method: 'POST', body: form });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
  assert.match(body.error.message, /No audio file was received/i);
});

await scenario('rejects a non-audio file extension', async () => {
  const { status, body } = await transcribe(app.base, {
    audio: Buffer.from('just text'),
    filename: 'notes.txt',
    type: 'text/plain',
  });
  assert.equal(status, 415);
  assert.equal(body.error.code, 'BAD_REQUEST');
});

await scenario('rejects an oversized upload', async () => {
  const { status, body } = await transcribe(app.base, {
    audio: Buffer.alloc(3 * 1024 * 1024, 1), // MAX_UPLOAD_MB=2
    filename: 'huge.wav',
  });
  assert.equal(status, 413);
  assert.match(body.error.message, /inline upload limit is 2 MB/i);
});

console.log('\nHappy path');
await scenario('transcribes with Deepgram and never calls the fallback', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });
  const { status, body } = await transcribe(app.base);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.engine, 'deepgram');
  assert.equal(body.model, 'nova-2');
  assert.equal(body.text, 'Primary engine transcript.');
  assert.equal(body.fallbackUsed, false);
  assert.equal(body.attempts.length, 1);
  assert.equal(body.attempts[0].ok, true);
  assert.equal(body.confidence, 0.97);
  assert.equal(body.audioSeconds, 1);
});

console.log('\nAutomatic fallback');
for (const [label, mode, expectedCode] of [
  ['429 rate limit', 'rate-limit', 'RATE_LIMITED'],
  ['402 out of credit', 'payment-required', 'PAYMENT_REQUIRED'],
  ['401 bad credentials', 'auth', 'AUTH'],
  ['5xx server error', 'server-error', 'SERVER_ERROR'],
  ['empty transcript', 'empty', 'EMPTY_TRANSCRIPT'],
]) {
  await scenario(`hands off to Gladia on ${label}`, async () => {
    await setModes({ deepgram: mode, gladia: 'ok' });
    const { status, body } = await transcribe(app.base);
    assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.engine, 'gladia');
    assert.equal(body.fallbackUsed, true);
    assert.equal(body.text, 'Fallback engine transcript.');
    assert.equal(body.attempts.length, 2);
    assert.equal(body.attempts[0].engine, 'deepgram');
    assert.equal(body.attempts[0].ok, false);
    assert.equal(body.attempts[0].code, expectedCode);
    assert.equal(body.attempts[1].ok, true);
    assert.match(body.warnings[0], /primary engine was unavailable/i);
  });
}

console.log('\nDeeper failover chain');
await scenario('walks past Gladia to AssemblyAI when the first two fail', async () => {
  await setModes({ deepgram: 'rate-limit', gladia: 'server-error', assemblyai: 'ok' });
  const { status, body } = await transcribe(app.base);
  assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
  assert.equal(body.engine, 'assemblyai');
  assert.equal(body.fallbackUsed, true);
  assert.equal(body.text, 'Third engine transcript.');
  assert.deepEqual(
    body.attempts.map((attempt) => attempt.engine),
    ['deepgram', 'gladia', 'assemblyai'],
  );
  assert.equal(body.attempts[0].code, 'RATE_LIMITED');
  assert.equal(body.attempts[1].code, 'SERVER_ERROR');
  assert.equal(body.attempts[2].ok, true);
  // AssemblyAI reports milliseconds; the parser must normalise to seconds.
  assert.deepEqual(body.words[1].start, 0.7);
  assert.equal(body.language, 'en');
});

await scenario('reaches Speechmatics as the last engine in the chain', async () => {
  await setModes({
    deepgram: 'auth',
    gladia: 'upload-error',
    assemblyai: 'rate-limit',
    speechmatics: 'ok',
  });
  const { status, body } = await transcribe(app.base);
  assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
  assert.equal(body.engine, 'speechmatics');
  assert.equal(body.model, 'enhanced');
  assert.equal(body.fallbackUsed, true);
  assert.equal(body.text, 'Fourth engine.');
  assert.equal(body.attempts.length, 4);
  assert.equal(body.attempts[3].ok, true);
});

await scenario('a non-retryable provider error stops the chain instead of burning credit', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok', assemblyai: 'job-error', speechmatics: 'ok' });
  const { status, body } = await transcribe(app.base, { fields: { engine: 'assemblyai' } });
  assert.equal(status, 502);
  assert.equal(body.error.code, 'PROVIDER_ERROR');
  assert.equal(body.error.attempts.length, 1, 'must not hand off bad audio to the next engine');
  assert.equal(body.error.attempts[0].engine, 'assemblyai');
  assert.equal(body.error.attempts[0].retryable, false);
});

await scenario('a pinned later engine is tried first, with the chain behind it', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok', assemblyai: 'ok' });
  const { status, body } = await transcribe(app.base, { fields: { engine: 'assemblyai' } });
  assert.equal(status, 200);
  assert.equal(body.engine, 'assemblyai');
  assert.equal(body.attempts[0].engine, 'assemblyai');
  assert.equal(body.fallbackUsed, false);
});

await scenario('Speechmatics rejects a remote URL instead of being called', async () => {
  await setModes();
  const response = await fetch(`${app.base}/api/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      audioUrl: 'https://mock123.public.blob.vercel-storage.com/stt-uploads/clip.webm',
      engine: 'speechmatics',
      fallback: 'false',
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
  assert.match(body.error.message, /bytes|does not accept/i);
});

console.log('\nUsage reporting');
await scenario('GET /api/usage reports every engine without inventing figures', async () => {
  const response = await fetch(`${app.base}/api/usage`);
  const body = await response.json();
  assert.equal(response.status, 200);

  assert.deepEqual(
    body.engines.map((entry) => entry.engine),
    ['deepgram', 'gladia', 'assemblyai', 'speechmatics'],
  );

  // Local counters exist for every engine and are labelled as such.
  for (const entry of body.engines) {
    assert.equal(entry.configured, true);
    assert.ok(entry.local, `${entry.engine} should have local counters`);
    assert.equal(typeof entry.local.requests, 'number');
  }

  // Providers expose different amounts of truth. Gladia and AssemblyAI
  // publish nothing, so those entries must say so rather than show a number.
  const byId = Object.fromEntries(body.engines.map((entry) => [entry.engine, entry]));
  assert.equal(byId.gladia.reportsUsage, 'none');
  assert.equal(byId.gladia.provider.available, false);
  assert.match(byId.gladia.provider.error, /dashboard|endpoint/i);
  assert.equal(byId.assemblyai.reportsUsage, 'none');
  assert.equal(byId.speechmatics.reportsUsage, 'usage');

  // Deepgram is the only engine that can report a *remaining* balance, so the
  // report must carry it through (and label its units).
  assert.equal(byId.deepgram.provider.available, true);
  assert.equal(byId.deepgram.provider.remaining.amount, 123.45);
  assert.equal(byId.deepgram.provider.remaining.units, 'USD');
  assert.equal(byId.deepgram.provider.consumption.hours, 1.5);
  assert.equal(byId.deepgram.provider.consumption.requests, 12);

  // Speechmatics reports consumption and explicitly no balance.
  assert.equal(byId.speechmatics.provider.available, true);
  assert.equal(byId.speechmatics.provider.consumption.hours, 0.25);
  assert.equal(byId.speechmatics.provider.consumption.jobs, 4);
  assert.equal(byId.speechmatics.provider.remaining, null);
  assert.match(byId.speechmatics.provider.note, /batch usage only/i);

  assert.equal(body.totals.requests >= 5, true);
  assert.ok(body.disclosure.localCounters);
  assert.ok(body.disclosure.providerFigures);
});

console.log('\nDouble failure handling');
await scenario('returns a structured error when the whole chain fails', async () => {
  await setModes({
    deepgram: 'rate-limit',
    gladia: 'server-error',
    assemblyai: 'auth',
    speechmatics: 'server-error',
  });
  const { status, body } = await transcribe(app.base);
  assert.equal(status, 502);
  assert.equal(body.error.code, 'SERVER_ERROR');
  assert.match(body.error.message, /All 4 engines failed \(deepgram, gladia, assemblyai, speechmatics\)/i);
  assert.equal(body.error.attempts.length, 4);
  assert.deepEqual(
    body.error.attempts.map((attempt) => attempt.code),
    ['RATE_LIMITED', 'SERVER_ERROR', 'AUTH', 'SERVER_ERROR'],
  );
  // Provider detail stays server-side (it goes to the server log instead).
  for (const attempt of body.error.attempts) assert.equal(attempt.detail, undefined);
  assert.equal(body.error.detail, undefined);
});

await scenario('reports a Gladia job error with a non-retryable code', async () => {
  await setModes({ deepgram: 'rate-limit', gladia: 'job-error' });
  const { status, body } = await transcribe(app.base);
  assert.equal(status, 502);
  assert.equal(body.error.attempts[1].code, 'PROVIDER_ERROR');
  assert.equal(body.error.attempts[1].retryable, false);
});

await scenario('surfaces an auth failure when the caller pins one engine', async () => {
  await setModes({ deepgram: 'auth', gladia: 'ok' });
  const { status, body } = await transcribe(app.base, {
    fields: { engine: 'deepgram', fallback: 'false' },
  });
  assert.equal(status, 502);
  assert.equal(body.error.code, 'AUTH');
  assert.equal(body.error.attempts.length, 1);
  assert.equal(body.error.attempts[0].engine, 'deepgram');
});

console.log('\nEngine pinning');
await scenario('gladia-first ordering works when the user picks Gladia', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });
  const { status, body } = await transcribe(app.base, { fields: { engine: 'gladia' } });
  assert.equal(status, 200);
  assert.equal(body.engine, 'gladia');
  assert.equal(body.fallbackUsed, false);
});

await scenario('a pinned engine with fallback disabled is used alone', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });
  const { status, body } = await transcribe(app.base, {
    fields: { engine: 'deepgram', fallback: 'false' },
  });
  assert.equal(status, 200);
  assert.equal(body.engine, 'deepgram');
  assert.equal(body.attempts.length, 1);
});

await scenario('language hints reach the provider query string', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });
  const { status, body } = await transcribe(app.base, { fields: { language: 'es' } });
  assert.equal(status, 200);
  assert.equal(body.engine, 'deepgram');
});

await app.close();

/* ------------------------------------------------------------------ */
/* Vercel deployment simulation                                        */
/*                                                                     */
/* The app is booted with VERCEL=1 (so serverless-safe defaults apply)  */
/* behind a proxy that enforces the platform's 4.5 MB body cap.         */
/* ------------------------------------------------------------------ */

console.log('\nVercel deployment (emulated)');
const vercel = await startApp({
  deepgramBase: `${deepgramMock.url}/v1/listen`,
  gladiaBase: `${gladiaMock.url}/v2`,
  simulateVercel: true,
  // Let MAX_UPLOAD_MB fall through to its serverless default (4 MB).
  omitEnv: ['MAX_UPLOAD_MB', 'BLOB_READ_WRITE_TOKEN'],
});

await scenario('health reports serverless-safe limits and the large-upload path', async () => {
  const response = await fetch(`${vercel.base}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.runtime.platform, 'vercel');
  assert.equal(body.limits.maxUploadMb, 4); // safe default, under the 4.5 MB cap
  assert.equal(body.limits.platformBodyLimitMb, 4.5);
  assert.equal(body.limits.maxDurationSeconds, 60);
  assert.equal(body.largeUploads.enabled, false); // no Blob store connected
});

await scenario('a small file stays inside the platform limit and transcribes', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });
  const { status, body } = await transcribe(vercel.base);
  assert.equal(status, 200);
  assert.equal(body.engine, 'deepgram');
});

await scenario('the route’s own guard rejects a 4.2 MB upload with a helpful hint', async () => {
  // 4.2 MB clears the platform's 4.5 MB cap, so the request reaches the app —
  // and the app's own 4 MB inline ceiling rejects it with a useful message
  // rather than letting the provider bounce it.
  const { status, body } = await transcribe(vercel.base, {
    audio: Buffer.alloc(Math.round(4.2 * 1024 * 1024), 7),
    filename: 'big.wav',
  });
  assert.equal(status, 413);
  assert.equal(body.error.code, 'BAD_REQUEST');
  assert.match(body.error.message, /inline upload limit is 4 MB/);
  assert.match(body.error.message, /MAX_UPLOAD_MB|Vercel Blob/);
});

await scenario('a 5 MB upload dies at the platform edge before the app can help', async () => {
  // This is the exact failure the Vercel Blob path exists to avoid: the request
  // never reaches the function, so no amount of server-side handling can save
  // it. The UI therefore routes anything above the inline limit to Blob storage.
  const { status, body } = await transcribe(vercel.base, {
    audio: Buffer.alloc(5 * 1024 * 1024, 7),
    filename: 'big.wav',
  });
  assert.equal(status, 413);
  assert.equal(body.error.code, 'FUNCTION_PAYLOAD_TOO_LARGE');
});

await scenario('a remote audio URL is accepted and forwarded to the provider', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });

  // The URL is opaque to this app: it never fetches the bytes, it only hands the
  // signed Blob URL to the provider, so a request can be tiny while the audio is
  // arbitrarily large.
  const form = new FormData();
  form.append(
    'audioUrl',
    'https://mock123.public.blob.vercel-storage.com/stt-uploads/interview.webm',
  );
  form.append('filename', 'interview.webm');
  form.append('engine', 'auto');
  form.append('fallback', 'true');
  form.append('durationSeconds', '900');

  const response = await fetch(`${vercel.base}/api/transcribe`, { method: 'POST', body: form });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.engine, 'deepgram');
  assert.equal(body.text, 'Primary engine transcript.');
  assert.equal(body.audioSeconds, 900);
});

await scenario('a JSON body carrying an audioUrl is accepted too', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });
  const response = await fetch(`${vercel.base}/api/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      audioUrl: 'https://mock123.public.blob.vercel-storage.com/stt-uploads/clip.webm',
      filename: 'clip.webm',
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.text, 'Primary engine transcript.');
});

await scenario('fallback still works for remote audio', async () => {
  await setModes({ deepgram: 'payment-required', gladia: 'ok' });
  const response = await fetch(`${vercel.base}/api/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      audioUrl: 'https://mock123.public.blob.vercel-storage.com/stt-uploads/clip.webm',
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.engine, 'gladia');
  assert.equal(body.fallbackUsed, true);
});

await scenario('rejects a third-party URL to avoid becoming an SSRF proxy', async () => {
  for (const hostile of [
    'https://169.254.169.254/latest/meta-data/iam/security-credentials/',
    'https://evil.example.com/audio.mp3',
    'http://mock123.public.blob.vercel-storage.com/clip.webm',
    'https://mock123.public.blob.vercel-storage.com.evil.com/clip.webm',
  ]) {
    const response = await fetch(`${vercel.base}/api/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audioUrl: hostile }),
    });
    const body = await response.json();
    assert.equal(response.status, 400, `should reject ${hostile}`);
    assert.match(body.error.message, /Vercel Blob store/i);
  }
});

await scenario('the blob upload route refuses to mint tokens when unconfigured', async () => {
  const response = await fetch(`${vercel.base}/api/blob/upload`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'blob.generate-client-token', payload: { pathname: 'x.webm' } }),
  });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error.code, 'MISSING_KEY');
});

await vercel.close();

/* --------------------------------------------------- rate-limit stage */

console.log('\nRate limiting (separate instance)');
const limited = await startApp({
  deepgramBase: `${deepgramMock.url}/v1/listen`,
  gladiaBase: `${gladiaMock.url}/v2`,
  extraEnv: { RATE_LIMIT_MAX: '2', RATE_LIMIT_WINDOW_SEC: '60' },
});

await scenario('returns 429 with a Retry-After header once the window is full', async () => {
  await setModes({ deepgram: 'ok', gladia: 'ok' });
  const first = await transcribe(limited.base, {});
  const second = await transcribe(limited.base, {});
  const third = await transcribe(limited.base, {});

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.equal(third.body.error.code, 'RATE_LIMITED');
  assert.match(third.body.error.message, /Too many transcription requests/i);
});

await scenario('health checks are not rate limited', async () => {
  const response = await fetch(`${limited.base}/api/health`);
  assert.equal(response.status, 200);
});

await limited.close();

/* ------------------------------------------------------------------ teardown */

await Promise.all([
  deepgramMock.close(),
  gladiaMock.close(),
  assemblyaiMock.close(),
  speechmaticsMock.close(),
]);

console.log(`\n${passed} passed, ${failures.length} failed\n`);

if (failures.length) {
  for (const failure of failures) console.error(`FAILED: ${failure.name}\n${failure.error.stack}\n`);
  process.exit(1);
}
