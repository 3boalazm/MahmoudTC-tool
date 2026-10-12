import TranscriptionStudio from '@/components/TranscriptionStudio';
import {
  BoltIcon,
  LayersIcon,
  ShieldIcon,
  SparkIcon,
  UploadIcon,
  WaveIcon,
} from '@/components/Icons';

const FEATURES = [
  {
    icon: UploadIcon,
    title: 'File or microphone',
    body: 'Drag in MP3, WAV, M4A, WebM, OGG, FLAC or AAC — or record straight from the browser with a live level meter.',
  },
  {
    icon: LayersIcon,
    title: 'Two engines, one request',
    body: 'Deepgram Nova-2 does the heavy lifting; Gladia takes over automatically the moment Deepgram hits a limit.',
  },
  {
    icon: ShieldIcon,
    title: 'Keys never reach the browser',
    body: 'Every request is proxied through a Next.js route handler, so your API keys stay on the server.',
  },
  {
    icon: SparkIcon,
    title: 'Editable, exportable output',
    body: 'Smart formatting and punctuation, live word counts, one-click copy, plus .txt and .srt downloads.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Load your audio',
    body: 'Upload a file or record live. The clip is decoded in-browser so you get a real waveform and duration before sending anything.',
  },
  {
    step: '02',
    title: 'Pick an engine',
    body: 'Leave it on Automatic, or pin Deepgram or Gladia. Add an optional language hint when you know what is being spoken.',
  },
  {
    step: '03',
    title: 'Transcribe & export',
    body: 'The proxy streams the audio to the provider and returns normalised text, timings and confidence. Edit, copy, or download.',
  },
];

const FAQS = [
  {
    q: 'When exactly does the fallback engine take over?',
    a: 'Automatically on 429 rate limits, 402 out-of-credit or payment errors, 401/403 authentication failures, 5xx server errors, request timeouts, network faults, and empty transcripts. Genuine client errors such as unsupported or corrupt audio are reported immediately instead of being retried, because the second engine would reject them too.',
  },
  {
    q: 'Where do my API keys live?',
    a: 'In .env.local on the server. The browser only ever calls this app’s own /api/transcribe route; the handler attaches the credentials server-side and never returns them in a response.',
  },
  {
    q: 'Is my audio stored anywhere?',
    a: 'No. Audio is buffered in memory for the duration of the request and forwarded to the provider. Nothing is written to disk, and no transcript is persisted by this app.',
  },
  {
    q: 'How large can a file be?',
    a: 'The default ceiling is 25 MB per request, configurable with MAX_UPLOAD_MB. Deepgram itself accepts up to 2 GB, so the app limit exists purely to protect your server’s memory.',
  },
  {
    q: 'Which languages are supported?',
    a: 'Deepgram Nova-2 handles 30+ languages natively. If you select a language Nova-2 does not support (Arabic, for example), the proxy switches that request to language auto-detection rather than failing, and Gladia detects the language on its own.',
  },
  {
    q: 'Can I deploy this to Vercel?',
    a: 'Yes. Add both keys as environment variables in the project settings. Serverless functions cap request duration, so raise maxDuration in the route or upgrade the plan for very long recordings.',
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <Hero />

        <div className="mt-12">
          <TranscriptionStudio />
        </div>

        <FeatureGrid />
        <HowItWorks />
        <FallbackFlow />
        <Faq />
      </main>

      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                     */
/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-500/12 bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <a href="#top" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-iris-500 to-iris-700 text-white shadow-[0_10px_30px_-12px_rgba(111,108,255,0.9)]">
            <WaveIcon className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-ink-100">
              Speech to Text Studio
            </span>
            <span className="block text-[11px] text-ink-500">Deepgram · Gladia fallback</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {[
            { href: '#studio', label: 'Transcriber' },
            { href: '#how', label: 'How it works' },
            { href: '#engines', label: 'Engines' },
            { href: '#faq', label: 'FAQ' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm text-ink-300 transition hover:bg-surface-2/70 hover:text-ink-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#studio"
          className="inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2 text-xs font-semibold text-ink-100 ring-1 ring-inset ring-ink-500/25 transition hover:bg-surface-3"
        >
          <BoltIcon className="size-3.5 text-iris-300" />
          Start now
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="animate-rise text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-iris-400/25 bg-iris-500/10 px-3.5 py-1.5 text-[11px] font-medium text-iris-300">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-mint-400" />
        </span>
        Deepgram Nova-2 with automatic Gladia failover
      </span>

      <h1 className="text-balance-tight mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink-100 sm:text-5xl lg:text-6xl">
        Turn any audio into
        <span className="bg-gradient-to-r from-iris-300 via-iris-400 to-mint-400 bg-clip-text text-transparent">
          {' '}
          clean, editable text
        </span>
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">
        Upload a recording or capture live from your microphone. Two best-in-class speech engines
        sit behind a single API route — if one hits a rate limit or runs out of credit, the other
        finishes the job without you noticing.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#studio"
          className="inline-flex items-center gap-2 rounded-2xl bg-iris-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(111,108,255,0.9)] transition hover:bg-iris-400"
        >
          <BoltIcon className="size-4" />
          Open the transcriber
        </a>
        <a
          href="#how"
          className="inline-flex items-center gap-2 rounded-2xl border border-ink-500/25 px-5 py-3 text-sm font-semibold text-ink-200 transition hover:border-iris-400/40 hover:text-ink-100"
        >
          See how it works
        </a>
      </div>

      <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: '2', label: 'STT engines' },
          { value: '30+', label: 'Nova-2 languages' },
          { value: '25 MB', label: 'Per upload' },
          { value: '0', label: 'Files stored' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-ink-500/15 bg-surface-1/50 px-4 py-3"
          >
            <dt className="sr-only">{item.label}</dt>
            <dd>
              <span className="block font-mono text-xl font-semibold tabular-nums text-ink-100">
                {item.value}
              </span>
              <span className="mt-0.5 block text-[11px] uppercase tracking-wider text-ink-500">
                {item.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="mt-20" aria-labelledby="features-heading">
      <h2 id="features-heading" className="sr-only">
        What this app does
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5 transition hover:border-iris-400/25 hover:bg-surface-2/50"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-surface-2 text-iris-300 ring-1 ring-ink-500/20">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-ink-100">{feature.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{feature.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mt-20 scroll-mt-20" aria-labelledby="how-heading">
      <div className="max-w-2xl">
        <h2 id="how-heading" className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">
          Three steps, no ceremony
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">
          The whole pipeline lives in one repo: a client studio, one API route, and two provider
          adapters that normalise wildly different response shapes into one contract.
        </p>
      </div>

      <ol className="mt-8 grid gap-4 lg:grid-cols-3">
        {STEPS.map((entry) => (
          <li
            key={entry.step}
            className="relative rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5"
          >
            <span className="font-mono text-xs font-semibold text-iris-300">{entry.step}</span>
            <h3 className="mt-3 text-base font-semibold text-ink-100">{entry.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{entry.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FallbackFlow() {
  const steps = [
    { label: 'Browser', detail: 'Blob · MediaRecorder', tone: 'neutral' },
    { label: '/api/transcribe', detail: 'validates · rate limits', tone: 'iris' },
    { label: 'Deepgram Nova-2', detail: 'primary engine', tone: 'iris' },
    { label: 'Gladia Solaria', detail: 'on 429 / 402 / 5xx', tone: 'mint' },
  ];

  return (
    <section id="engines" className="mt-20 scroll-mt-20" aria-labelledby="engines-heading">
      <div className="max-w-2xl">
        <h2
          id="engines-heading"
          className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl"
        >
          One request, two safety nets
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">
          Failures are classified, not swallowed. Each provider error is mapped to a code —{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-iris-300">
            RATE_LIMITED
          </code>
          ,{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-iris-300">
            PAYMENT_REQUIRED
          </code>
          ,{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-iris-300">
            AUTH
          </code>{' '}
          — and only retryable codes trigger the hand-off.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5">
          <ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            {steps.map((step, index) => (
              <li key={step.label} className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2">
                <div
                  className={`w-full rounded-2xl border px-3.5 py-3 text-center ${
                    step.tone === 'iris'
                      ? 'border-iris-400/30 bg-iris-500/10'
                      : step.tone === 'mint'
                        ? 'border-mint-500/30 bg-mint-500/10'
                        : 'border-ink-500/20 bg-surface-2/60'
                  }`}
                >
                  <p className="text-[13px] font-semibold text-ink-100">{step.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">{step.detail}</p>
                </div>
                {index < steps.length - 1 ? (
                  <span aria-hidden="true" className="text-ink-500 sm:hidden">
                    ↓
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
            If both engines fail, the route returns a structured error with the per-provider attempt
            trail, and the UI renders it verbatim instead of a generic “something went wrong”.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-iris-400/25 bg-iris-500/8 p-5">
            <h3 className="text-sm font-semibold text-ink-100">Deepgram · Nova-2</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
              Primary engine. Smart formatting, punctuation, paragraph segmentation and word
              timestamps for subtitle export.
            </p>
            <p className="mt-3 font-mono text-[11px] text-iris-300">
              POST api.deepgram.com/v1/listen
            </p>
          </div>
          <div className="rounded-3xl border border-mint-500/25 bg-mint-500/8 p-5">
            <h3 className="text-sm font-semibold text-ink-100">Gladia · Solaria</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
              Fallback engine. Upload → create job → poll, with utterance-level timings for the same
              subtitle output.
            </p>
            <p className="mt-3 font-mono text-[11px] text-mint-400">POST api.gladia.io/v2/transcription</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="mt-20 scroll-mt-20" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">
        Questions worth asking
      </h2>

      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5 transition open:border-iris-400/25 open:bg-surface-2/50"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink-100 marker:hidden">
              {faq.q}
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-500/25 text-ink-400 transition group-open:rotate-45 group-open:border-iris-400/40 group-open:text-iris-300"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-400">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-500/12 bg-canvas/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          Speech to Text Studio · Next.js App Router, Tailwind CSS v4, Deepgram &amp; Gladia behind a
          server-side proxy.
        </p>
        <p className="flex items-center gap-2">
          <ShieldIcon className="size-3.5 text-mint-400" />
          Bring your own API keys — nothing is logged or stored.
        </p>
      </div>
    </footer>
  );
}
