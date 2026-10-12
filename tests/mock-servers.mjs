/**
 * tests/mock-servers.mjs
 * ---------------------------------------------------------------------------
 * Runs the two provider mocks on fixed ports so a dev server can be pointed at
 * them. Used to demo the full pipeline without spending real provider credits:
 *
 *   node tests/mock-servers.mjs
 *   DEEPGRAM_API_KEY=demo GLADIA_API_KEY=demo \
 *   DEEPGRAM_BASE_URL=http://127.0.0.1:8787/v1/listen \
 *   GLADIA_BASE_URL=http://127.0.0.1:8788/v2 \
 *   next dev -p 3001
 *
 * Scenarios are switched at runtime:
 *   curl -X POST localhost:8787/__scenario -H 'content-type: application/json' \
 *        -d '{"mode":"rate-limit"}'
 */

import { startDeepgramMock, startGladiaMock } from './mock-providers.mjs';

const DEEPGRAM_PORT = 8787;
const GLADIA_PORT = 8788;

const deepgram = await startDeepgramMock(DEEPGRAM_PORT);
const gladia = await startGladiaMock(GLADIA_PORT);

console.log(`Deepgram mock → ${deepgram.url}/v1/listen`);
console.log(`Gladia mock   → ${gladia.url}/v2`);
console.log('\nModes: ok · rate-limit · payment-required · auth · server-error · empty (deepgram)');
console.log('       ok · upload-error · server-error · job-error (gladia)');

const shutdown = async () => {
  await Promise.all([deepgram.close(), gladia.close()]);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
