/**
 * lib/engines-meta.js
 * ---------------------------------------------------------------------------
 * Presentation + capability metadata for every supported engine. Pure data, no
 * secrets and no Node APIs, so both the server (API routes) and the browser
 * (engine picker, usage panel) can import the exact same source of truth.
 *
 * `usage` describes how much account data a provider is willing to expose:
 *   'balance+usage' — remaining credit and consumption (Deepgram)
 *   'usage'         — consumption only (Speechmatics)
 *   'none'          — nothing public; we fall back to local counters
 */

export const ENGINES = [
  {
    id: 'deepgram',
    label: 'Deepgram',
    model: 'Nova-2',
    shortModel: 'Nova-2',
    blurb: 'Fastest, most accurate',
    description:
      'Deepgram Nova-2 — smart formatting, punctuation, paragraph segmentation and word timestamps.',
    docsUrl: 'https://developers.deepgram.com/docs/pre-recorded-audio',
    dashboardUrl: 'https://console.deepgram.com/',
    signupUrl: 'https://console.deepgram.com/signup',
    keyVar: 'DEEPGRAM_API_KEY',
    modelVar: 'DEEPGRAM_MODEL',
    accent: 'iris',
    supportsRemoteUrl: true,
    usage: 'balance+usage',
    usageNote: 'Remaining credit and audio hours via the Deepgram management API.',
  },
  {
    id: 'gladia',
    label: 'Gladia',
    model: 'Solaria',
    shortModel: 'Solaria',
    blurb: 'High reliability, async jobs',
    description:
      'Gladia Solaria — upload, then create a job and poll it, with utterance-level timings.',
    docsUrl: 'https://docs.gladia.io/api-reference/v2/transcription/init',
    dashboardUrl: 'https://app.gladia.io/',
    signupUrl: 'https://app.gladia.io/',
    keyVar: 'GLADIA_API_KEY',
    modelVar: null,
    accent: 'mint',
    supportsRemoteUrl: true,
    usage: 'none',
    usageNote: 'Gladia does not publish a usage or balance endpoint — local counters only.',
  },
  {
    id: 'assemblyai',
    label: 'AssemblyAI',
    model: 'Universal',
    shortModel: 'Universal',
    blurb: 'Strong accuracy, async jobs',
    description:
      'AssemblyAI Universal — language detection, punctuation and word-level timings.',
    docsUrl: 'https://www.assemblyai.com/docs/api-reference/transcripts/submit',
    dashboardUrl: 'https://www.assemblyai.com/dashboard/',
    signupUrl: 'https://www.assemblyai.com/dashboard/signup',
    keyVar: 'ASSEMBLYAI_API_KEY',
    modelVar: 'ASSEMBLYAI_MODEL',
    accent: 'amber',
    supportsRemoteUrl: true,
    usage: 'none',
    usageNote: 'AssemblyAI does not publish a usage or balance endpoint — local counters only.',
  },
  {
    id: 'speechmatics',
    label: 'Speechmatics',
    model: 'Enhanced',
    shortModel: 'Enhanced',
    blurb: 'Enhanced accuracy, batch API',
    description:
      'Speechmatics batch API — model selected with SPEECHMATICS_MODEL (standard, enhanced or melia-1).',
    docsUrl: 'https://docs.speechmatics.com/api-ref/batch/create-a-new-job',
    dashboardUrl: 'https://portal.speechmatics.com/',
    signupUrl: 'https://portal.speechmatics.com/signup',
    keyVar: 'SPEECHMATICS_API_KEY',
    modelVar: 'SPEECHMATICS_MODEL',
    accent: 'rose',
    supportsRemoteUrl: false,
    usage: 'usage',
    usageNote: 'Audio hours and job counts for the requested period via the /usage endpoint.',
  },
];

export const ENGINE_IDS = ENGINES.map((engine) => engine.id);

export const ENGINE_MAP = Object.fromEntries(ENGINES.map((engine) => [engine.id, engine]));

/** The default failover order for the `auto` mode. */
export const DEFAULT_ENGINE_ORDER = ['deepgram', 'gladia', 'assemblyai', 'speechmatics'];

/** Coerce arbitrary request input into a known engine id, or 'auto'. */
export function normaliseEngineId(value) {
  const engine = String(value ?? '').trim().toLowerCase();
  return engine === 'auto' || ENGINE_MAP[engine] ? engine : 'auto';
}

/** Human label for an engine id. */
export function engineLabel(id) {
  return ENGINE_MAP[id]?.label ?? '—';
}

/** "Deepgram Nova-2" */
export function engineModelLabel(id, model) {
  const meta = ENGINE_MAP[id];
  if (!meta) return id ?? '—';
  return `${meta.label} ${model || meta.model}`;
}

/** Tailwind classes per engine accent, kept here so they cannot drift. */
export const ACCENT_CLASSES = {
  iris: {
    ring: 'border-iris-400/30 bg-iris-500/10',
    text: 'text-iris-300',
    dot: 'bg-iris-400',
    bar: 'bg-iris-400',
  },
  mint: {
    ring: 'border-mint-500/30 bg-mint-500/10',
    text: 'text-mint-400',
    dot: 'bg-mint-400',
    bar: 'bg-mint-400',
  },
  amber: {
    ring: 'border-amber-500/30 bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
  },
  rose: {
    ring: 'border-rose-500/30 bg-rose-500/10',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    bar: 'bg-rose-400',
  },
};

export function accentFor(id) {
  return ACCENT_CLASSES[ENGINE_MAP[id]?.accent] ?? ACCENT_CLASSES.iris;
}
