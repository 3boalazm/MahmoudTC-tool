/**
 * tests/mock-servers.mjs
 * ---------------------------------------------------------------------------
 * Runs every provider mock on fixed ports so a dev server can be pointed at
 * them. Used to demo the full pipeline without spending real provider credits:
 *
 *   node tests/mock-servers.mjs
 *   DEEPGRAM_API_KEY=demo GLADIA_API_KEY=demo \
 *   ASSEMBLYAI_API_KEY=demo SPEECHMATICS_API_KEY=demo \
 *   DEEPGRAM_BASE_URL=http://127.0.0.1:8787/v1/listen \
 *   GLADIA_BASE_URL=http://127.0.0.1:8788/v2 \
 *   ASSEMBLYAI_BASE_URL=http://127.0.0.1:8789 \
 *   SPEECHMATICS_BASE_URL=http://127.0.0.1:8790 \
 *   next dev -p 3001
 *
 * Scenarios are switched at runtime:
 *   curl -X POST localhost:8787/__scenario -H 'content-type: application/json' \
 *        -d '{"mode":"rate-limit"}'
 */

import {
  startAssemblyAIMock,
  startDeepgramMock,
  startGladiaMock,
  startSpeechmaticsMock,
} from './mock-providers.mjs';

const PORTS = { deepgram: 8787, gladia: 8788, assemblyai: 8789, speechmatics: 8790 };

const deepgram = await startDeepgramMock(PORTS.deepgram);
const gladia = await startGladiaMock(PORTS.gladia);
const assemblyai = await startAssemblyAIMock(PORTS.assemblyai);
const speechmatics = await startSpeechmaticsMock(PORTS.speechmatics);

console.log(`Deepgram mock     → ${deepgram.url}/v1/listen`);
console.log(`Gladia mock       → ${gladia.url}/v2`);
console.log(`AssemblyAI mock   → ${assemblyai.url}  (/upload, /transcript)`);
console.log(`Speechmatics mock → ${speechmatics.url}  (/jobs, /usage)`);
console.log('\nModes: ok · rate-limit · payment-required · auth · server-error · empty (deepgram)');
console.log('       ok · upload-error · server-error · job-error (gladia)');
console.log('       ok · rate-limit · auth · server-error · job-error (assemblyai, speechmatics)');

const shutdown = async () => {
  await Promise.all([
    deepgram.close(),
    gladia.close(),
    assemblyai.close(),
    speechmatics.close(),
  ]);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
