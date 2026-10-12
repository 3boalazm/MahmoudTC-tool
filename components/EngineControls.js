'use client';

/**
 * components/EngineControls.js
 * ---------------------------------------------------------------------------
 * Engine selection, automatic-fallback switch, and language hint.
 *
 * The engine picker is a radio group: it reports churn-free keyboard behaviour
 * (arrow keys move the selection) and each option shows whether this deployment
 * actually holds the matching API key.
 */

import { BoltIcon, GlobeIcon, LayersIcon, ShieldIcon } from '@/components/Icons';

export const LANGUAGES = [
  { value: '', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Mandarin Chinese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'id', label: 'Indonesian' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'es', label: 'Spanish' },
  { value: 'sv', label: 'Swedish' },
  { value: 'th', label: 'Thai' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'vi', label: 'Vietnamese' },
];

const OPTIONS = [
  {
    id: 'auto',
    title: 'Automatic',
    subtitle: 'Deepgram first, Gladia as backup',
    icon: BoltIcon,
    badge: 'Recommended',
  },
  {
    id: 'deepgram',
    title: 'Deepgram',
    subtitle: 'Nova-2 · fastest, most accurate',
    icon: ShieldIcon,
  },
  {
    id: 'gladia',
    title: 'Gladia',
    subtitle: 'Solaria · high reliability',
    icon: LayersIcon,
  },
];

export default function EngineControls({
  engine,
  onEngineChange,
  fallback,
  onFallbackChange,
  language,
  onLanguageChange,
  availability = { deepgram: true, gladia: true },
  fallbackOptionEnabled = true,
  disabled = false,
}) {
  const engineAvailable = (id) => {
    if (id === 'auto') return availability.deepgram || availability.gladia;
    return Boolean(availability[id]);
  };

  const handleKeyDown = (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const usable = OPTIONS.filter((option) => engineAvailable(option.id));
    if (!usable.length) return;
    const index = usable.findIndex((option) => option.id === engine);
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = usable[(index + delta + usable.length) % usable.length];
    onEngineChange(next.id);
  };

  return (
    <section
      id="engine"
      className="glass-panel animate-rise rounded-4xl p-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9)] sm:p-6"
      aria-labelledby="engine-heading"
    >
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-mint-500/15 text-mint-400 ring-1 ring-mint-500/25">
          <LayersIcon className="size-5" />
        </span>
        <div>
          <h2 id="engine-heading" className="text-base font-semibold text-ink-100">
            2 · Pick an engine
          </h2>
          <p className="text-sm text-ink-400">
            Automatic fallback keeps working when a provider hits a limit.
          </p>
        </div>
      </header>

      <div
        role="radiogroup"
        aria-labelledby="engine-heading"
        onKeyDown={handleKeyDown}
        className="mt-5 grid gap-2.5 sm:grid-cols-3"
      >
        {OPTIONS.map((option) => {
          const available = engineAvailable(option.id);
          const selected = engine === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onEngineChange(option.id)}
              disabled={disabled || !available}
              title={
                available
                  ? option.subtitle
                  : `No API key configured for ${option.title} on this deployment`
              }
              className={`group relative flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                selected
                  ? 'border-iris-400/60 bg-iris-500/12 shadow-[0_0_0_1px_rgba(143,146,255,0.25)_inset]'
                  : 'border-ink-500/20 bg-surface-1/60 hover:border-iris-400/35 hover:bg-surface-2/60'
              }`}
            >
              <span className="flex items-center justify-between">
                <Icon className={`size-4.5 ${selected ? 'text-iris-300' : 'text-ink-400'}`} />
                <span className="flex items-center gap-1.5">
                  {option.badge && selected ? (
                    <span className="rounded-full bg-iris-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-iris-300">
                      {option.badge}
                    </span>
                  ) : null}
                  <span
                    className={`size-1.5 rounded-full ${
                      available ? 'bg-mint-400' : 'bg-amber-400'
                    }`}
                    aria-hidden="true"
                  />
                </span>
              </span>
              <span className="text-sm font-semibold text-ink-100">{option.title}</span>
              <span className="text-[11px] leading-relaxed text-ink-400">
                {available ? option.subtitle : 'API key not configured'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* ------------------------------------------------ fallback switch */}
        <div className="flex items-start gap-3 rounded-2xl border border-ink-500/20 bg-surface-1/60 p-3.5">
          <Switch
            id="fallback-toggle"
            checked={fallback && fallbackOptionEnabled}
            disabled={disabled || !fallbackOptionEnabled}
            onChange={onFallbackChange}
            label="Automatic fallback"
            labelledBy="fallback-label"
          />
          <div className="min-w-0">
            <p
              id="fallback-label"
              className={`text-sm font-medium text-ink-100 ${
                disabled || !fallbackOptionEnabled ? 'opacity-60' : ''
              }`}
            >
              Automatic fallback
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
              {fallbackOptionEnabled
                ? 'Switch engines automatically on 429 rate limits, 402 out-of-credit, auth or server errors.'
                : 'Locked on by the deployment (ALLOW_CLIENT_FALLBACK_OPTION=false).'}
            </p>
          </div>
        </div>

        {/* -------------------------------------------------- language hint */}
        <div className="rounded-2xl border border-ink-500/20 bg-surface-1/60 p-3.5">
          <label
            htmlFor="language-select"
            className="flex items-center gap-2 text-sm font-medium text-ink-100"
          >
            <GlobeIcon className="size-4 text-ink-400" />
            Spoken language
          </label>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
            Leave on auto-detect unless you know the language — a hint improves accuracy.
          </p>
          <select
            id="language-select"
            value={language}
            disabled={disabled}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="mt-2.5 w-full appearance-none rounded-xl border border-ink-500/25 bg-surface-2 px-3 py-2 text-sm text-ink-100 transition hover:border-iris-400/40 focus:border-iris-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {LANGUAGES.map((option) => (
              <option key={option.value || 'auto'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

/**
 * Accessible switch. A real <button role="switch"> keeps keyboard behaviour
 * (Enter/Space) and screen-reader semantics correct with zero CSS trickery.
 */
function Switch({ id, checked, onChange, disabled, label, labelledBy }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full ring-1 ring-inset transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-iris-500 ring-iris-400/60' : 'bg-surface-3 ring-ink-500/40'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
