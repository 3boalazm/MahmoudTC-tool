/**
 * tests/mock-providers.mjs
 * ---------------------------------------------------------------------------
 * Stand-in servers for every engine the app can talk to, used by `npm run test:e2e`.
 *
 * The app never forwards client-controlled headers or fields to a provider (and
 * it should not), so behaviour is configured out-of-band through a control
 * endpoint on the mock itself:
 *
 *   POST /__scenario   { "mode": "rate-limit" }
 *
 * Deepgram modes:     ok | rate-limit | payment-required | auth | server-error | empty
 * Gladia modes:       ok | upload-error | server-error | job-error
 * AssemblyAI modes:   ok | rate-limit | auth | server-error | job-error
 * Speechmatics modes: ok | rate-limit | auth | server-error | job-error
 */

import { createServer } from 'node:http';

const readBody = (request) =>
  new Promise((resolve) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
  });

const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

/**
 * Shared scaffolding: a mutable scenario, the `/__scenario` control endpoint,
 * and a request counter so tests can assert how many calls were made.
 */
function createMock({ onRequest, port = 0 }) {
  const state = { mode: 'ok', requests: 0 };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const raw = await readBody(request);

    if (url.pathname === '/__scenario') {
      const parsed = raw.length ? JSON.parse(raw.toString('utf8')) : {};
      if (typeof parsed.mode === 'string') state.mode = parsed.mode;
      state.requests = 0;
      return json(response, 200, { mode: state.mode });
    }

    if (url.pathname === '/__state') {
      return json(response, 200, { mode: state.mode, requests: state.requests });
    }

    state.requests += 1;
    return onRequest({ request, response, url, state, raw });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        state,
        /** Change what the mock does for the next requests. */
        async setMode(mode) {
          await fetch(`http://127.0.0.1:${server.address().port}/__scenario`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ mode }),
          });
        },
        get requests() {
          return state.requests;
        },
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

/* ------------------------------------------------------------------ deepgram */

export function startDeepgramMock(port = 0) {
  return createMock({
    port,
    onRequest({ response, url, state }) {
      /*
       * Management API stand-ins, so `/api/usage` can be exercised end to end.
       * These are the only endpoints that legitimately report a *remaining*
       * balance, which makes them worth faking precisely.
       */
      if (url.pathname === '/v1/projects') {
        return json(response, 200, {
          projects: [{ project_id: 'mock-project', name: 'Mock project' }],
        });
      }
      if (url.pathname === '/v1/projects/mock-project/balances') {
        return json(response, 200, {
          balances: [
            { balance_id: 'balance-1', amount: 120.45, units: 'USD' },
            { balance_id: 'balance-2', amount: 3, units: 'USD' },
          ],
        });
      }
      if (url.pathname === '/v1/projects/mock-project/usage/breakdown') {
        return json(response, 200, {
          start: url.searchParams.get('start'),
          end: url.searchParams.get('end'),
          results: [
            { hours: 1.25, requests: 9, grouping: { models: ['nova-2'] } },
            { hours: 0.25, requests: 3, grouping: { models: ['nova-3'] } },
          ],
        });
      }

      if (url.pathname !== '/v1/listen') {
        return json(response, 404, { err_msg: 'not found' });
      }

      switch (state.mode) {
        case 'rate-limit':
          return json(response, 429, { err_msg: 'Rate limit exceeded. Please retry later.' });
        case 'payment-required':
          return json(response, 402, {
            err_msg: 'Insufficient funds. Please add a payment method to continue.',
          });
        case 'auth':
          return json(response, 401, { err_msg: 'Invalid credentials.' });
        case 'server-error':
          return json(response, 503, { err_msg: 'Service temporarily unavailable.' });
        default:
          break;
      }

      const transcript = state.mode === 'empty' ? '' : 'Primary engine transcript.';

      return json(response, 200, {
        metadata: { request_id: 'dg-mock-1', duration: 3.5, language: 'en' },
        results: {
          channels: [
            {
              detected_language: 'en',
              alternatives: [
                {
                  transcript,
                  confidence: 0.97,
                  words: transcript
                    ? [
                        { word: 'primary', punctuated_word: 'Primary', start: 0, end: 0.7, confidence: 0.98 },
                        { word: 'engine', punctuated_word: 'engine', start: 0.7, end: 1.2, confidence: 0.96 },
                      ]
                    : [],
                  paragraphs: {
                    paragraphs: [{ sentences: transcript ? [{ text: transcript }] : [] }],
                  },
                },
              ],
            },
          ],
        },
      });
    },
  });
}

/* -------------------------------------------------------------------- gladia */

export function startGladiaMock(port = 0) {
  let jobId = 0;

  return createMock({
    port,
    onRequest({ response, request, url, state }) {
      if (state.mode === 'upload-error' && url.pathname === '/v2/upload') {
        return json(response, 500, { message: 'Gladia upload failed.' });
      }

      // A generic provider outage: every write endpoint answers 500.
      if (state.mode === 'server-error' && request.method === 'POST') {
        return json(response, 500, { message: 'Gladia is temporarily unavailable.' });
      }

      if (url.pathname === '/v2/upload' && request.method === 'POST') {
        return json(response, 200, {
          audio_url: 'https://mock.gladia.local/file/1',
          audio_metadata: { filename: 'clip.webm', size: 1024, audio_duration: 3.5 },
        });
      }

      if (url.pathname === '/v2/transcription' && request.method === 'POST') {
        jobId += 1;
        return json(response, 201, {
          id: `job-${jobId}`,
          status: 'queued',
          request_id: 'G-mock-1',
        });
      }

      if (url.pathname.startsWith('/v2/transcription/') && request.method === 'GET') {
        const id = url.pathname.split('/').pop();

        if (state.mode === 'job-error') {
          return json(response, 200, {
            id,
            status: 'error',
            error_code: 'INTEGRATION_ERROR',
            message: 'Gladia could not decode the audio.',
          });
        }

        return json(response, 200, {
          id,
          status: 'done',
          request_id: 'G-mock-1',
          file: { audio_duration: 3.5 },
          result: {
            transcription: {
              full_transcript: 'Fallback engine transcript.',
              languages: ['en'],
              utterances: [{ text: 'Fallback engine transcript.', start: 0, end: 1.6, speaker: 0 }],
            },
          },
        });
      }

      return json(response, 404, { message: 'not found' });
    },
  });
}

/* ---------------------------------------------------------------- assemblyai */

export function startAssemblyAIMock(port = 0) {
  let jobId = 0;

  return createMock({
    port,
    onRequest({ response, request, url, state }) {
      if (url.pathname === '/upload' && request.method === 'POST') {
        if (state.mode === 'auth') return json(response, 401, { error: 'Authentication failed.' });
        if (state.mode === 'server-error') return json(response, 500, { error: 'Upload failed.' });
        return json(response, 200, { upload_url: 'https://mock.assemblyai.local/upload/1' });
      }

      if (url.pathname === '/transcript' && request.method === 'POST') {
        switch (state.mode) {
          case 'rate-limit':
            return json(response, 429, { error: 'Too many requests.' });
          case 'auth':
            return json(response, 401, { error: 'Authentication failed.' });
          case 'server-error':
            return json(response, 500, { error: 'Internal server error.' });
          default:
            break;
        }

        jobId += 1;
        return json(response, 200, { id: `aai-${jobId}`, status: 'queued' });
      }

      if (url.pathname.startsWith('/transcript/') && request.method === 'GET') {
        const id = url.pathname.split('/').pop();

        if (state.mode === 'job-error') {
          return json(response, 200, {
            id,
            status: 'error',
            error: 'Audio file could not be decoded.',
          });
        }

        return json(response, 200, {
          id,
          status: 'completed',
          language_code: 'en_us',
          audio_duration: 3.5,
          confidence: 0.94,
          text: 'Third engine transcript.',
          // Note: AssemblyAI reports **milliseconds** — the parser converts them.
          words: [
            { text: 'Third', start: 0, end: 700, confidence: 0.95 },
            { text: 'engine', start: 700, end: 1200, confidence: 0.93 },
          ],
          utterances: [{ text: 'Third engine transcript.', start: 0, end: 1600, confidence: 0.94 }],
        });
      }

      return json(response, 404, { error: 'not found' });
    },
  });
}

/* -------------------------------------------------------------- speechmatics */

export function startSpeechmaticsMock(port = 0) {
  let jobId = 0;

  return createMock({
    port,
    onRequest({ response, request, url, state }) {
      if (url.pathname === '/jobs/' && request.method === 'POST') {
        switch (state.mode) {
          case 'rate-limit':
            return json(response, 429, {
              code: 429,
              error: 'Max concurrent running jobs exceeded',
            });
          case 'auth':
            return json(response, 401, { code: 401, error: 'Permission Denied' });
          case 'server-error':
            return json(response, 500, { code: 500, error: 'Internal Server Error' });
          default:
            break;
        }

        jobId += 1;
        return json(response, 201, { id: `sm-${jobId}`, status: 'running' });
      }

      if (url.pathname === '/jobs' && request.method === 'GET') {
        return json(response, 200, {
          jobs: [],
          count: 0,
        });
      }

      if (url.pathname === '/usage' && request.method === 'GET') {
        const row = {
          mode: 'batch',
          type: 'transcription',
          language: 'en',
          operating_point: 'enhanced',
          count: 4,
          duration_hrs: 0.25,
        };
        return json(response, 200, {
          since: url.searchParams.get('since') ?? '2026-01-01',
          until: url.searchParams.get('until') ?? '2026-01-31',
          summary: [row],
          details: [row],
        });
      }

      if (/^\/jobs\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
        const id = url.pathname.split('/').pop();

        if (state.mode === 'job-error') {
          return json(response, 200, {
            job: {
              id,
              status: 'rejected',
              errors: [{ type: 'audio_error', message: 'Audio decode failed' }],
            },
          });
        }

        // The real API nests the status: { "job": { "id": …, "status": "done" } }.
        return json(response, 200, { job: { id, status: 'done' } });
      }

      if (/^\/jobs\/[^/]+\/transcript$/.test(url.pathname) && request.method === 'GET') {
        const id = url.pathname.split('/')[2];

        return json(response, 200, {
          format: 'json-v2',
          job: { id, created_at: '2026-01-01T00:00:00Z', data_name: 'clip.webm', duration: 3.5 },
          metadata: {
            transcription_config: { language: 'en', model: 'enhanced' },
            language_pack_info: { language_description: 'English', word_delimiter: ' ' },
          },
          results: [
            {
              type: 'word',
              start_time: 0,
              end_time: 0.4,
              alternatives: [{ content: 'Fourth', confidence: 0.92 }],
            },
            {
              type: 'word',
              start_time: 0.4,
              end_time: 0.9,
              alternatives: [{ content: 'engine', confidence: 0.9 }],
            },
            {
              type: 'punctuation',
              start_time: 0.9,
              end_time: 0.9,
              attaches_to: 'previous',
              alternatives: [{ content: '.', confidence: 1 }],
            },
          ],
        });
      }

      return json(response, 404, { code: 404, error: 'not found' });
    },
  });
}
