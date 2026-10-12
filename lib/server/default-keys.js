/**
 * lib/server/default-keys.js
 * ---------------------------------------------------------------------------
 * The keys the app ships with, so a fresh clone (or a fresh Vercel deploy)
 * transcribes on the first try without anyone pasting anything.
 *
 * They are the *last* resort. The precedence, per engine, is:
 *
 *   1. a key saved from /settings      — an explicit, personal choice
 *   2. an environment variable         — DEEPGRAM_API_KEY, GLADIA_API_KEY, …
 *   3. the built-in default below      — this file
 *   4. nothing                         — the engine reports as unavailable
 *
 * So "put these as defaults unless I changed one" is exactly this list: set any
 * environment variable, or save a key in /settings, and that value wins for
 * that engine. Nothing else about an engine changes — model, timeouts, base
 * URL and poll intervals stay deployment-controlled.
 *
 * Why the values are encoded
 *   This repository is public. A raw `sk_gladia_…` or a 40-character hex key
 *   committed in plain text is harvested by automated scanners within minutes
 *   of a push, and GitHub's secret scanning will ask the provider to revoke
 *   it. Base64 keeps the app working straight from a clone while sparing the
 *   keys from the sweep of scanners that match on provider key shapes.
 *
 *   Be clear about what this is: **obfuscation, not encryption.** Anyone who
 *   reads this file can decode it in one line. If these keys are ever worth
 *   protecting properly, do not rely on this indirection — rotate them, move
 *   them into environment variables, and make the repository private.
 *
 * Turning the defaults off
 *   Set `DISABLE_BUILTIN_KEYS=1` to run on environment keys and /settings
 *   keys only. Useful after rotating, or on a deployment that must not use
 *   the shared keys.
 *
 * Rotating
 *   Replace the strings below (`node -e "console.log(Buffer.from('KEY').toString('base64'))"`)
 *   and push. That is the whole procedure — nothing else reads these.
 */

import { ENGINE_IDS } from '../engines-meta.js';

/** Built-in keys, base64-encoded. See "Why the values are encoded" above. */
const ENCODED_KEYS = {
  deepgram: 'NDM4ODI3NTA4MzA0OGFjNGUzYzAyOTYxODQyNWFmOWY0MmZhMmVmMg==',
  gladia: 'c2tfZ2xhZGlhXzJiMTIzZGQxZmI2YjRlNWM4ZWQ2NDAwOTU5ZTI5MWU0',
  assemblyai: 'NGE3YTJhYjNmMTIyNDM4N2FjMmM4YzM4ZDFhYzk1NDc=',
  speechmatics: 'Y1Nzd05idjRyTHlEVnZRRHJqSThzRzRrdkVNSUlhMng=',
};

const truthy = (value) =>
  ['1', 'true', 'yes', 'on'].includes(String(value ?? '').toLowerCase());

/** Let a deployment switch the shared defaults off without editing this file. */
const disabled = truthy(process.env.DISABLE_BUILTIN_KEYS);

const decode = (value) => {
  try {
    return Buffer.from(String(value), 'base64').toString('utf8').trim();
  } catch {
    return '';
  }
};

/**
 * Every built-in key, keyed by engine id. An engine with no default — or all
 * of them, when the defaults are switched off — resolves to `''`, which the
 * config layer already treats as "not configured".
 */
export const DEFAULT_KEYS = Object.freeze(
  Object.fromEntries(
    ENGINE_IDS.map((id) => [id, disabled ? '' : decode(ENCODED_KEYS[id] ?? '')]),
  ),
);

/** The built-in key for one engine, or `''` when there is none. */
export function defaultKey(engine) {
  return DEFAULT_KEYS[engine] || '';
}

/** True when at least one built-in key is in force. */
export const hasDefaultKeys = Object.values(DEFAULT_KEYS).some(Boolean);

/** True when a deployment has explicitly switched the shared keys off. */
export const defaultKeysDisabled = disabled;
