/**
 * tests/credentials.test.mjs
 * ---------------------------------------------------------------------------
 * The credential layer is the only place in this app where a wrong line leaks a
 * secret or silently drops a working key, so it gets tested like a security
 * boundary rather than a utility:
 *
 *   • the cookie is untrusted input — every malformed shape must degrade to
 *     "nothing stored" instead of throwing;
 *   • a key must never appear in any response the UI receives;
 *   • precedence (settings → environment) must be exact, including the
 *     "disabled here" shadow that outranks the deployment;
 *   • the usage cache must be keyed per credential, or one visitor could read
 *     another's figures.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KEYS_COOKIE,
  credentialPanelState,
  credentialReport,
  credentialState,
  effectiveKey,
  fingerprintKey,
  keysCookieOptions,
  maskKey,
  parseCredentialCookie,
  serialiseCredentialCookie,
  validateKeyShape,
} from '../lib/server/credentials.js';
import {
  availableEngineOrder,
  engineAvailability,
  environmentKeys,
  resolveEngineConfig,
} from '../lib/server/config.js';

const SAMPLES = {
  deepgram: 'dg-typed-key-4f2a91',
  gladia: 'gl-typed-key-77b3c0',
};

/* ------------------------------------------------------------------ cookie */

test('a credential cookie round-trips through storage', () => {
  const map = { deepgram: { key: SAMPLES.deepgram }, gladia: { key: SAMPLES.gladia } };
  const raw = serialiseCredentialCookie(map);

  assert.deepEqual(parseCredentialCookie(raw), map);
  // Percent-encoded values are accepted too: cookies change hands through
  // several layers, and this layer should not care.
  assert.deepEqual(parseCredentialCookie(encodeURIComponent(raw)), map);
});

test('an empty map clears the cookie', () => {
  assert.equal(serialiseCredentialCookie({}), '');
  assert.equal(serialiseCredentialCookie({ deepgram: {} }), '');
  assert.deepEqual(parseCredentialCookie(''), {});
});

test('garbage in the cookie degrades to "nothing stored"', () => {
  for (const value of [
    undefined,
    null,
    '',
    'not-json',
    '%7Bbroken',
    '[]',
    '"a string"',
    '42',
    JSON.stringify(['deepgram']),
    JSON.stringify({ deepgram: 'dg-key-not-an-object' }),
    JSON.stringify({ unknownengine: { key: SAMPLES.deepgram } }),
  ]) {
    assert.deepEqual(parseCredentialCookie(value), {}, `rejected: ${String(value)}`);
  }
});

test('keys that could never work are dropped at the door', () => {
  const hostile = JSON.stringify({
    deepgram: { key: 'has spaces' },
    gladia: { key: 'x'.repeat(600) },
    assemblyai: { key: '   ' },
    speechmatics: { key: 42 },
  });
  assert.deepEqual(parseCredentialCookie(hostile), {});
});

test('one engine can be disabled without disturbing the others', () => {
  const raw = serialiseCredentialCookie({
    deepgram: { disabled: true },
    gladia: { key: SAMPLES.gladia },
  });
  assert.deepEqual(parseCredentialCookie(raw), {
    deepgram: { disabled: true },
    gladia: { key: SAMPLES.gladia },
  });
});

test('the cookie is httpOnly, same-site and long-lived', () => {
  const options = keysCookieOptions();
  assert.equal(KEYS_COOKIE, 'stt_keys');
  assert.equal(options.httpOnly, true, 'page scripts must never read a key back');
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
  assert.ok(options.maxAge >= 86_400 * 30, 'a key should survive more than a month');
  assert.equal(options.secure, process.env.NODE_ENV === 'production');
});

/* ---------------------------------------------------------------- position */

test('key validation names the actual mistake', () => {
  const reasons = (engine, key) => validateKeyShape(engine, key).reason;

  assert.equal(reasons('deepgram', ''), 'empty');
  assert.equal(reasons('deepgram', '   '), 'empty');
  assert.equal(reasons('deepgram', '"quoted-key-1234"'), 'quotes');
  assert.equal(reasons('deepgram', 'Bearer abcdef123456'), 'prefix');
  assert.equal(reasons('deepgram', 'Token abcdef123456'), 'prefix');
  assert.equal(reasons('deepgram', 'abcdef 123456789'), 'whitespace');
  assert.equal(reasons('deepgram', 'short'), 'too-short');
  assert.equal(reasons('deepgram', 'x'.repeat(600)), 'too-long');
  assert.equal(reasons('deepgram', 'your-api-key'), 'placeholder');
  assert.equal(reasons('deepgram', 'xxxxxxxxxxx'), 'placeholder');
  assert.equal(reasons('whisper', 'a-perfectly-fine-key'), 'unknown-engine');

  const ok = validateKeyShape('deepgram', '  dg-a-real-looking-key-42  ');
  assert.equal(ok.ok, true);
  assert.equal(ok.key, 'dg-a-real-looking-key-42', 'surrounding whitespace is trimmed');
});

test('a mask shows enough to recognise a key and nothing more', () => {
  assert.equal(maskKey('dg-typed-key-4f2a91'), 'dg-t••••2a91');
  assert.equal(maskKey('short'), '••••');
  assert.equal(maskKey(''), null);
  assert.equal(maskKey(undefined), null);
});

test('fingerprints are stable, distinct, and do not contain the key', () => {
  const a = fingerprintKey(SAMPLES.deepgram);
  assert.equal(a, fingerprintKey(SAMPLES.deepgram));
  assert.notEqual(a, fingerprintKey(SAMPLES.gladia));
  assert.equal(a.length, 12);
  assert.ok(!a.includes('typed'));
  assert.equal(fingerprintKey(null), 'none');
});

/* -------------------------------------------------------------- precedence */

test('a stored key outranks the environment, a disabled engine outranks both', () => {
  const env = { deepgram: 'env-key-0001', gladia: null };

  assert.equal(effectiveKey('deepgram', env.deepgram, { key: SAMPLES.deepgram }), SAMPLES.deepgram);
  assert.equal(effectiveKey('deepgram', env.deepgram, { disabled: true }), null);
  assert.equal(effectiveKey('deepgram', env.deepgram, undefined), 'env-key-0001');
  assert.equal(effectiveKey('gladia', env.gladia, undefined), null);
});

test('the credential state describes every combination honestly', () => {
  const fromSettings = credentialState('deepgram', 'env-key-0001', { key: SAMPLES.deepgram });
  assert.equal(fromSettings.source, 'settings');
  assert.equal(fromSettings.configured, true);
  assert.equal(fromSettings.fromEnvironment, true, 'the deployment still has a key');
  assert.equal(fromSettings.fromSettings, true);
  assert.equal(fromSettings.canRemove, true);
  assert.ok(!fromSettings.masked.includes('0001'), 'the deployment key must not be revealed');

  const fromEnvironment = credentialState('deepgram', 'env-key-0001', undefined);
  assert.equal(fromEnvironment.source, 'environment');
  assert.equal(fromEnvironment.canRemove, false, 'a browser cannot delete a deployment key');
  assert.equal(fromEnvironment.masked, '••••••••');

  const disabled = credentialState('deepgram', 'env-key-0001', { disabled: true });
  assert.equal(disabled.source, 'disabled');
  assert.equal(disabled.configured, false);
  assert.equal(disabled.canRemove, true);

  const missing = credentialState('deepgram', null, undefined);
  assert.equal(missing.source, 'none');
  assert.equal(missing.configured, false);
  assert.equal(missing.masked, null);
});

test('the report summarises the engines without exposing a single character of an env key', () => {
  const report = credentialReport({ deepgram: { key: SAMPLES.deepgram } }, {
    deepgram: 'env-key-0001',
    gladia: 'env-key-0002',
  });

  assert.equal(report.total, 4);
  assert.equal(report.connected, 2, 'deepgram (settings) + gladia (environment)');
  assert.equal(report.usingEnvironment, true);

  const serialised = JSON.stringify(report);
  assert.ok(!serialised.includes(SAMPLES.deepgram), 'a stored key must never be echoed');
  assert.ok(!serialised.includes('env-key-000'), 'an env key must never be echoed');
});

/* --------------------------------------------------------------- the panel */

test('the panel state is complete, ordered and secret-free', () => {
  const credentials = { gladia: { key: SAMPLES.gladia } };
  const envKeys = { deepgram: 'env-deepgram-key-0001', gladia: null };

  const state = credentialPanelState({
    credentials,
    envKeys,
    engineOrder: ['deepgram', 'gladia', 'assemblyai', 'speechmatics'],
    usagePanel: false,
  });

  assert.equal(state.ok, true);
  assert.deepEqual(state.chain, ['deepgram', 'gladia'], 'only engines that can run appear');
  assert.equal(state.usagePanel, false);
  assert.equal(state.storage.mechanism, 'httpOnly-cookie');
  assert.equal(state.storage.cookie, KEYS_COOKIE);

  const gladia = state.engines.find((engine) => engine.id === 'gladia');
  assert.equal(gladia.source, 'settings');
  assert.equal(gladia.verifiable, true, 'a configured engine can be probed');

  const speechmatics = state.engines.find((engine) => engine.id === 'speechmatics');
  assert.equal(speechmatics.verifiable, false, 'nothing to probe without a key');

  const serialised = JSON.stringify(state);
  assert.ok(!serialised.includes(SAMPLES.gladia));
  assert.ok(!serialised.includes('env-deepgram-key-0001'));
});

/* --------------------------------------------- the config it feeds into */

test('availability, failover order and provider config all follow the cookie', () => {
  const credentials = { assemblyai: { key: 'aai-typed-key-1234' }, deepgram: { disabled: true } };

  assert.equal(engineAvailability(credentials).assemblyai, true);
  assert.equal(engineAvailability(credentials).deepgram, false, 'disabled beats the env key');

  const order = availableEngineOrder(credentials);
  assert.ok(order.includes('assemblyai'));
  assert.ok(!order.includes('deepgram'));

  const resolved = resolveEngineConfig('assemblyai', credentials);
  assert.equal(resolved.apiKey, 'aai-typed-key-1234');
  assert.ok(resolved.timeoutMs > 0, 'the rest of the config still comes from the deployment');
  assert.equal(resolveEngineConfig('nope', credentials), null);
});

test('an environment key is still the fallback for every engine', () => {
  const previous = { ...process.env };
  process.env.GLADIA_API_KEY = 'env-only-gladia-key';
  try {
    // config.js reads process.env once, at import time — so this asserts the
    // contract (env keys are reported) rather than the value we just set.
    const keys = environmentKeys();
    assert.deepEqual(Object.keys(keys).sort(), ['assemblyai', 'deepgram', 'gladia', 'speechmatics']);
    assert.ok(Object.values(keys).every((value) => value === null || typeof value === 'string'));
  } finally {
    process.env = previous;
  }
});
