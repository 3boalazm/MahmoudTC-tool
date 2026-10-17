/**
 * lib/i18n/dictionaries/en.js
 * ---------------------------------------------------------------------------
 * The English source of truth for every user-facing string.
 *
 * `ar.js` mirrors this object key-for-key; `tests/i18n.test.mjs` fails the
 * build if the two ever drift apart, so a missing translation can never ship
 * as a blank label.
 *
 * Interpolation uses single braces: t('home.badge', { count: 4 }).
 */

const en = {
  /* ------------------------------------------------------------------ meta */
  meta: {
    title: 'Speech to Text Studio',
    tagline: 'Audio to text, with real failover',
    description:
      'Turn audio files or live microphone recordings into accurate, editable text. Four speech engines behind one API route, with automatic failover and a built-in usage panel.',
    keywords: [
      'speech to text',
      'transcription',
      'audio to text',
      'Deepgram',
      'Gladia',
      'AssemblyAI',
      'Speechmatics',
      'Next.js',
    ],
  },

  /* ------------------------------------------------------------------- nav */
  nav: {
    label: 'Main navigation',
    home: 'Home',
    studio: 'Transcriber',
    engines: 'Engines',
    usage: 'Usage',
    faq: 'FAQ',
    settings: 'Settings',
    skip: 'Skip to the transcriber',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
    start: 'Start now',
    maker: 'The Maker',
  },

  /* ---------------------------------------------------------------- common */
  common: {
    loading: 'Loading…',
    retry: 'Try again',
    cancel: 'Cancel',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied',
    refresh: 'Refresh',
    recommended: 'Recommended',
    optional: 'Optional',
    learnMore: 'Learn more',
    readMore: 'Read more',
    backHome: 'Back to home page',
    available: 'Available',
    unavailable: 'Unavailable',
    noKey: 'No API key',
    noKeyLong: 'not configured',
    configured: 'Configured',
    enginesCount: '{count} engines',
    step: 'Step {number}',
    poweredBy: 'Powered by',
    theme: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    language: 'Language',
    english: 'English',
    arabic: 'العربية',
    switchToArabic: 'التبديل إلى العربية',
    switchToEnglish: 'Switch to English',
    install: 'Install app',
    installing: 'Installing…',
    installed: 'App installed',
    dismiss: 'Dismiss',
    yes: 'Yes',
    no: 'No',
  },

  /* ------------------------------------------------------------------ home */
  home: {
    metaTitle: 'Audio to text, with real failover',
    badge: '{count} speech engines · automatic failover',
    heroTitleLead: 'Turn any audio into',
    heroTitleAccent: 'clean, editable text',
    heroBody:
      'Upload a recording or capture live from your microphone. Four best-in-class speech engines sit behind a single API route — if one hits a rate limit or runs out of credit, the next one finishes the job without you noticing.',
    ctaPrimary: 'Open the transcriber',
    ctaSecondary: 'How failover works',
    stats: {
      engines: 'STT engines',
      languages: 'Languages detected',
      upload: 'Per upload',
      stored: 'Files stored',
      uploadValue: '25 MB+',
      languagesValue: '20+',
      storedValue: '0',
    },
    highlightsTitle: 'Why this studio',
    highlights: [
      {
        title: 'File or microphone',
        body: 'Drag in MP3, WAV, M4A, WebM, OGG, FLAC or AAC — or record straight from the browser with a live level meter.',
      },
      {
        title: 'Four engines, one request',
        body: 'Deepgram does the heavy lifting, with Gladia, AssemblyAI and Speechmatics queued behind it, each taking over the moment the previous one hits a limit.',
      },
      {
        title: 'Keys never reach the browser',
        body: 'Every request is proxied through a Next.js route handler, so your API keys stay on the server.',
      },
      {
        title: 'Editable, exportable output',
        body: 'Smart formatting and punctuation, live word counts, one-click copy, plus .txt and .srt downloads.',
      },
    ],
    stepsTitle: 'Three steps, no ceremony',
    steps: [
      {
        title: 'Load your audio',
        body: 'Upload a file or record live. The clip is decoded in-browser, so you get a real waveform and duration before sending anything.',
      },
      {
        title: 'Pick an engine',
        body: 'Leave it on Automatic, or pin any configured engine. Add an optional language hint when you know what is being spoken.',
      },
      {
        title: 'Transcribe & export',
        body: 'The proxy streams the audio to the provider and returns normalised text, timings and confidence. Edit, copy or download.',
      },
    ],
    chainTitle: 'One request, {count} safety nets',
    chainBody:
      'Failures are classified, not swallowed: each provider error is mapped to a code, and only retryable codes trigger a hand-off. An engine with no key is skipped instead of failing.',
    chainFootnote:
      'If the whole chain fails, the route returns a structured error with the per-provider attempt trail, and the UI renders it verbatim instead of a generic “something went wrong”.',
    exploreTitle: 'Go deeper',
    explore: [
      {
        title: 'The transcriber',
        body: 'Upload or record, pick an engine, copy the result.',
        href: '/studio',
        cta: 'Open the studio',
      },
      {
        title: 'Engines & failover',
        body: 'What each provider is good at, and exactly when the hand-off happens.',
        href: '/engines',
        cta: 'Compare engines',
      },
      {
        title: 'Usage & remaining limits',
        body: 'What this app has consumed, and what each provider will tell you.',
        href: '/usage',
        cta: 'See the report',
      },
      {
        title: 'Questions',
        body: 'Pricing, privacy, limits, and what happens when everything fails.',
        href: '/faq',
        cta: 'Read the FAQ',
      },
    ],
  },

  /* ---------------------------------------------------------------- studio */
  studio: {
    metaTitle: 'Transcriber',
    metaDescription:
      'Upload an audio file or record from your microphone and transcribe it with automatic engine failover.',
    heading: 'Transcribe audio',
    subheading: 'Upload or record, choose an engine, then export the text.',
    stepSource: '1 · Load audio',
    stepEngine: '2 · Pick an engine',
    stepResult: '3 · Result',
    run: 'Transcribe audio',
    running: 'Transcribing…',
    runHint: 'Transcribe (⌘/Ctrl + Enter)',
    runHintRecording: 'Stop the recording first',
    runHintNoAudio: 'Load or record some audio first',
    cancel: 'Cancel',
    noAudio: 'No audio loaded yet',
    manageKeys: 'Manage your API keys',
    connectEngine: 'Connect an engine',
    fallbackArmed: 'fallback armed',
    noEngine: 'No engine available',
    keysServerSide: 'Keys stay server-side',
    uploading: 'Uploading {percent}%',
    timing: {
      heading: 'Processing times',
      upload: 'Upload time',
      transcription: 'Transcription time',
      total: 'Total time',
      uploadNote: 'Inline uploads happen inside the API request, so the browser cannot time them separately; transcription time includes the full request.',
    },
    stage: {
      uploading: 'Uploading to storage… {percent}%',
      sending: 'Sending audio to the server proxy…',
      opening: 'Opening a stream to {engine}…',
      transcribing: 'Transcribing with {engine}…',
      stillWorking: 'Still working — {fallback} is queued if {engine} gives up…',
      long: 'Still transcribing — long recordings can take a while…',
    },
    footerNoKeys:
      'No engine keys detected — add one of {keys} to .env.local (or your Vercel project) and restart.',
    footerInline:
      'Audio is sent to this app’s own API route and forwarded straight to the provider.',
    footerBlob:
      'Files up to {inline} MB stream through the function; larger files (up to {max} MB) upload directly to Vercel Blob and are deleted the moment transcription finishes.',
    footerLimit: 'Maximum upload size: {size} MB.',
    resumeCta: 'Transcribe again',
    ownership: {
      aria: 'About this custom transcription tool',
      eyebrow: 'CUSTOM-BUILT TOOL',
      title: 'A tailored transcription workspace',
      ownerLabel: 'Customised and owned by',
    },
  },

  /* ---------------------------------------------------------- audio source */
  source: {
    heading: '1 · Add your audio',
    tabsLabel: 'Audio source',
    uploadTab: 'Upload a file',
    recordTab: 'Record live',
    recordHint: 'Browser microphone',
    dropTitle: 'Drop an audio file here',
    dropBody: 'or {browse} from your computer',
    browse: 'browse',
    formats: 'MP3 · WAV · M4A · MP4 · WebM · OGG · Opus · FLAC · AAC · AMR · AIFF',
    maxSize: 'Up to {size} MB through the app · {blob} MB via storage',
    chooseFile: 'Choose a file',
    replace: 'Replace',
    recording: 'Recording… speak naturally',
    paused: 'Paused — resume or stop to finish',
    permission: 'Waiting for microphone permission…',
    finishing: 'Finishing up…',
    press: 'Press the microphone to start',
    start: 'Start recording',
    stop: 'Stop recording',
    pause: 'Pause',
    resume: 'Resume',
    level: 'Input level',
    noMediaRecorder:
      'This browser cannot record audio (MediaRecorder is unavailable). Upload a file instead.',
    insecure:
      'Recording needs a secure context. Open this page over https:// or on localhost.',
    emptyFile: 'That file is empty.',
    tooLargeHint: 'Connect a Vercel Blob store to lift the ceiling, raise MAX_UPLOAD_MB, or trim the clip.',
    wrongType: 'That does not look like an audio file. Try MP3, WAV, M4A, WebM or OGG.',
    tooLarge: 'That file is larger than the {size} MB limit for this deployment.',
    decoded: 'Ready to transcribe',
    fromMic: 'recorded from microphone',
    fromFile: 'from file',
    clear: 'Remove audio',
    preview: 'Preview',
    linkTab: 'From a link',
    linkHint: 'Audio or video URL',
    linkLabel: 'Link to an audio or video file',
    linkAdd: 'Use this link',
    linkHelp:
      'Paste a direct link to a file (for example …/episode.mp3 or …/clip.mp4), up to {size} MB. The server downloads it for you. Web pages such as YouTube are not supported.',
    fromLink: 'from a link',

    link: {
      EMPTY: 'Paste a link to an audio or video file.',
      TOO_LONG: 'That link is too long.',
      INVALID: 'That does not look like a valid link.',
      PROTOCOL: 'Only http:// and https:// links are supported.',
      CREDENTIALS: 'Links that contain a username or password are not supported.',
      PORT: 'Only links on the standard web ports are supported.',
      PRIVATE_HOST: 'That link points to a private or internal address, which cannot be used.',
      PAGE_LINK:
        'That is a web page (YouTube, Instagram, …), not a media file. Paste a direct link to an audio or video file, such as one ending in .mp3 or .mp4.',
    },

    rec: {
      UNSUPPORTED: 'This browser does not support in-browser recording. Upload a file instead.',
      PERMISSION_DENIED:
        'Microphone permission was denied. Allow access in your browser settings and try again.',
      NO_MICROPHONE: 'No microphone was found on this device.',
      MIC_IN_USE:
        'The microphone is already in use by another application. Close it and try again.',
      OVERCONSTRAINED: 'The selected microphone does not support the requested settings.',
      INSECURE: 'Microphone access requires a secure (https) connection.',
      INTERRUPTED: 'Microphone access was interrupted. Please try again.',
      START_FAILED: 'The microphone could not be started.',
      INIT_FAILED: 'Recording could not be initialised in this browser.',
      RECORDER_ERROR: 'The recorder reported an unexpected error.',
      EMPTY_RECORDING: 'The recording came out empty. Check your microphone input level.',
    },
  },

  /* ------------------------------------------------------- engine controls */
  engines: {
    metaTitle: 'Engines',
    metaDescription:
      'Deepgram, Gladia, AssemblyAI and Speechmatics behind one API route, with a classified failover chain.',
    heading: 'Four engines, one contract',
    subheading:
      'Each provider speaks a different dialect (streaming, async jobs, multipart, JSON). The proxy normalises all of them into the same response, so switching engines never changes your code.',
    pickHeading: '2 · Pick an engine',
    automatic: 'Automatic',
    autoBlurb: 'Failover chain',
    keyed: '{available}/{total} keyed',
    keyedHint: 'engines configured — failures roll down the chain automatically.',
    noKeyHint: 'Automatic fallback keeps working when a provider hits a limit.',
    missingKey: '{engine} is not configured — set {key} to enable it',
    chainPosition: 'Position {position} in the failover chain',
    fallbackLabel: 'Automatic fallback',
    fallbackOn:
      'On 429 rate limits, 402 out-of-credit, auth errors and 5xx failures, the next engine in the chain picks up the request.',
    fallbackLocked: 'Locked on by the deployment (ALLOW_CLIENT_FALLBACK_OPTION=false).',
    languageLabel: 'Spoken language',
    languageHint:
      'Leave on auto-detect unless you know the language — a hint improves accuracy.',
    languageAuto: 'Auto-detect',
    chainNote:
      'Engines are tried in the order shown. A single request can survive several providers failing in a row — the transcript tells you which engine produced it and why the others were skipped.',
    primary: 'Primary',
    fallback: 'Fallback {number}',
    acceptsAudio: 'Accepts a URL or raw bytes',
    bytesOnly: 'Byte upload only',
    model: 'Model',
    key: 'Key',
    limits: 'Limits',
    usageApi: 'Usage API',
    usageDeepgram: 'Balance + hours',
    usageSpeechmatics: 'Batch hours',
    usageNone: 'None (dashboard only)',
    docs: 'Provider docs',
    dashboard: 'Dashboard',
    apiKeyGuide: {
      heading: 'How to get an API key',
      step1: 'Create an account with the provider.',
      createAccount: 'Create account',
      step2: 'Open the dashboard, find API Keys or the keys section, and generate a new key.',
      step3: 'Copy the key and add it in Settings under the matching provider.',
      settings: 'Settings',
      note: 'Required variable: {key}. Keep your API key private.',
    },
    chainHeading: 'Failover order',
    chainBody:
      'The order is one environment variable: {var}. Engines without a key are skipped, and unknown ids are appended, so a typo can never leave you with zero engines.',
    codesHeading: 'Which failures hand off',
    retryable: 'Hands off to the next engine',
    fatal: 'Reported immediately',
    codeTable: {
      code: 'Code',
      trigger: 'Trigger',
      behaviour: 'Behaviour',
    },
  },

  /* ------------------------------------------------------------ transcript */
  transcript: {
    speaker: 'Speaker {number}',
    options: {
      speakers: 'Separate speakers',
      speakersHint: 'Label each speaker turn',
      timeline: 'Show timeline',
      timelineHint: 'Add start and end times to each chunk',
    },
    speakerNames: {
      heading: 'Name the speakers',
      hint: 'Enter a name for each detected speaker. The transcript updates as you type.',
      placeholder: 'Name for speaker {number}',
    },
    heading: 'Transcript',
    subheading: 'Editable, copyable, and exportable as .txt or .srt.',
    copy: 'Copy',
    copied: 'Copied',
    clear: 'Clear',
    downloadTxt: 'Download .txt',
    downloadSrt: 'Download .srt',
    srtHint: 'Download subtitles',
    srtUnavailable: 'This engine did not return timings',
    placeholder: 'Your transcript will appear here…',
    ariaLabel: 'Transcript text',
    emptyTitle: 'Nothing transcribed yet',
    emptyBody:
      'Load a file or record something, then press {action}. Nothing is stored — audio is forwarded and discarded.',
    action: 'Transcribe',
    running: 'Transcribing…',
    failedTitle: 'Transcription failed',
    failedBody: 'Something went wrong while contacting the transcription service.',
    fallbackNotice:
      'The primary engine was unavailable, so the fallback engine produced this transcript.',
    stats: {
      words: 'Words',
      characters: 'Characters',
      sentences: 'Sentences',
      readTime: 'Read time',
      engine: 'Engine',
      language: 'Language',
      audio: 'Audio',
      processed: 'Processed in',
      confidence: 'Confidence',
    },
  },

  /* ----------------------------------------------------------------- usage */
  usage: {
    metaTitle: 'Usage & remaining limits',
    metaDescription:
      'Per-engine consumption for this app, plus every usage and balance figure the providers actually publish.',
    heading: 'Usage & remaining limits',
    body: '“How much have I used, and how much is left?” — answered per engine, with the source of every number stated.',
    panelHeading: 'Usage & remaining limits',
    panelSubtitle: 'Consumption for the last {days} days, reported per engine.',
    panelSubtitleFallback: 'What this app has consumed, and what each provider reports.',
    refresh: 'Refresh',
    copyReport: 'Copy report',
    copied: 'Copied',
    summary: {
      requests: 'Requests',
      audio: 'Audio processed',
      fallback: 'Served by fallback',
      keyed: 'Engines keyed',
    },
    remaining: 'Remaining',
    used: 'Used',
    jobs: 'Jobs',
    thisApp: 'This app',
    noApi: 'No API for usage',
    notConfigured: 'Not configured',
    noApiBody:
      'This provider does not publish usage or balance data over its API.',
    openDashboard: 'Open provider dashboard →',
    lastUsed: 'last used {when}',
    justNow: 'just now',
    minutesAgo: '{count}m ago',
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago',
    loadingError: '{message} Provider figures need a key with management/read scope; consumption is still counted locally.',
    provenance: 'Where these numbers come from',
    provenanceLocalTitle: '“This app” figures',
    provenanceLocal:
      'are counted by the server, per engine, since the process started. They reset on every restart or deploy and are per-instance — they are a session view, not billing records.',
    provenanceProviderTitle: 'Provider figures',
    provenanceProvider:
      'are read from each vendor’s own API and cached for {minutes}.',
    provenanceProviderSome:
      'Deepgram reports a real remaining balance; Speechmatics reports usage but no balance.',
    provenanceProviderNone: 'None of the configured engines expose usage to the API right now.',
    provenanceMissingTitle: 'What is deliberately missing:',
    provenanceMissing:
      'no engine shows a “remaining minutes” projection, because only Deepgram publishes a balance and no provider publishes your plan’s included quota. Anything else would be a guess.',
    provenanceWarning:
      '⚠️ This panel exposes account-level consumption. Set {var} to switch it off on a public deployment.',
    chainLabel: 'failover chain: {chain}',
    period: 'Period',
    minutes: '{count} min',
    hours: '{count} h',
    underMinute: 'under a minute',
    zeroMinutes: '0 min',
  },

  /* ------------------------------------------------------------------- faq */
  faq: {
    metaTitle: 'FAQ',
    metaDescription:
      'Pricing, privacy, upload limits, engine failover and troubleshooting for the Speech to Text Studio.',
    heading: 'Questions worth asking',
    subheading: 'Everything people ask before trusting an app with their audio.',
    items: [
      {
        q: 'When exactly does the fallback engine take over?',
        a: 'Automatically on 429 rate limits, 402 out-of-credit or payment errors, 401/403 authentication failures, 5xx server errors, request timeouts, network faults, and empty transcripts. Genuine client errors such as unsupported or corrupt audio are reported immediately instead of being retried, because the next engine would reject them too.',
      },
      {
        q: 'Where do my API keys live?',
        a: 'Either in .env.local (or your hosting provider’s environment variables) on the server, or in an httpOnly cookie on your own device when you paste one on the settings page — your key always wins. The browser only ever calls this app’s own /api/transcribe route; the handler attaches the credentials server-side and never returns them in a response.',
      },
      {
        q: 'Is my audio stored anywhere?',
        a: 'No. Audio is buffered in memory for the duration of the request and forwarded to the provider. Nothing is written to disk, and no transcript is persisted by this app. If you use the large-file path, the object exists in Blob storage only until the transcript comes back, then it is deleted.',
      },
      {
        q: 'How large can a file be?',
        a: 'Up to 25 MB streams straight through the API route. Anything larger is uploaded straight from your browser to Vercel Blob — bypassing the serverless 4.5 MB body limit entirely — and deleted the instant the transcript comes back. The ceiling (MAX_UPLOAD_MB) is configurable.',
      },
      {
        q: 'Which languages are supported?',
        a: 'Deepgram Nova-2 handles 30+ languages natively, and AssemblyAI detects the language on its own. If you pick a language Nova-2 does not support (Arabic, for example), that request is switched to auto-detection rather than failing; Speechmatics is skipped for that attempt because it requires an explicit language.',
      },
      {
        q: 'Can I deploy this to Vercel?',
        a: 'Yes — and it was designed for it. Add the engine keys as project environment variables, plus BLOB_READ_WRITE_TOKEN to switch on large-file uploads. Provider timeouts are clamped to the function budget automatically, so a slow provider degrades into a clean error instead of a killed function.',
      },
      {
        q: 'Can I install it like a native app?',
        a: 'Yes. The app ships a web manifest and a service worker, so Android, iOS and desktop browsers offer “Add to Home Screen” or a dedicated install button. Once installed it opens full-screen, keeps its own icon, and the interface shell loads even when you are offline.',
      },
      {
        q: 'Is there a light theme and Arabic support?',
        a: 'Both. The theme toggle switches between light, dark and your system preference, and the language switcher flips the entire interface — including layout direction — between English and Arabic.',
      },
    ],
    troubleshootTitle: 'Troubleshooting',
    troubleshootSubtitle: 'The errors you are most likely to actually see.',
    trouble: [
      {
        symptom: '“No speech-to-text engine is configured”',
        fix: 'No key is set at all. Add at least one to .env.local and restart the dev server (env files are read at boot).',
      },
      {
        symptom: '413 FUNCTION_PAYLOAD_TOO_LARGE',
        fix: 'The upload exceeded Vercel’s 4.5 MB body cap. Connect a Blob store so large files bypass the function.',
      },
      {
        symptom: '413 “inline upload limit”',
        fix: 'Working as designed. Re-import the file (with a Blob store connected it routes through storage) or raise MAX_UPLOAD_MB.',
      },
      {
        symptom: '429 Too many transcription requests',
        fix: 'Your own rate limit. Wait for the window or raise RATE_LIMIT_MAX.',
      },
      {
        symptom: '402 / AUTH in the attempt trail, transcript still returned',
        fix: 'The fallback worked. Top up or rotate the failing engine’s key to restore it.',
      },
      {
        symptom: 'Microphone does nothing',
        fix: 'Browsers require a secure context. http://localhost counts; a LAN IP over http does not.',
      },
      {
        symptom: 'Usage panel says “no API for usage”',
        fix: 'Correct: Gladia and AssemblyAI publish usage only in their dashboards. Deepgram’s card needs a key with management scope; Speechmatics’ needs a key for the same region as SPEECHMATICS_BASE_URL.',
      },
    ],
  },

  /* ------------------------------------------------------------------- pwa */
  pwa: {
    installTitle: 'Install Speech to Text Studio',
    installBody: 'Opens full-screen, works offline, and keeps your place in the app.',
    installButton: 'Install',
    later: 'Not now',
    installed: 'Installed',
    manualHint: 'Install from your browser’s menu',
    iosTitle: 'Add to your iPhone Home Screen',
    iosBody:
      'Tap the Share button, then “Add to Home Screen”. Safari does not offer an install prompt automatically.',
    iosShare: 'Share',
    iosAdd: 'Add to Home Screen',
    offlineTitle: 'You are offline',
    offlineBody:
      'The app shell still loads, but transcription needs a connection because your audio never leaves the device otherwise.',
    offlineRetry: 'Try again',
  },

  /* ---------------------------------------------------------------- errors */
  errors: {
    generic: 'Something went wrong while contacting the transcription service.',
    network: 'The request could not reach the server. Check your connection and try again.',
    aborted: 'Transcription cancelled.',
    code: {
      MISSING_KEY:
        'This engine has no API key configured on this deployment. Pick another engine or add the key.',
      AUTH: 'The provider rejected our credentials. Check the API key for that engine.',
      PAYMENT_REQUIRED:
        'That engine’s account is out of credit. Top it up, or let the fallback engine handle it.',
      RATE_LIMITED: 'That engine is rate limited right now. The next engine in the chain is used.',
      QUOTA_EXCEEDED: 'That engine’s quota is used up.',
      TIMEOUT: 'That engine took too long and the request was aborted.',
      SERVER_ERROR: 'The provider reported a server-side failure.',
      BAD_REQUEST: 'The provider rejected this audio. Check the format and try another file.',
      EMPTY_TRANSCRIPT:
        'No speech could be detected in that audio. Check that the recording is audible and not silent.',
      NETWORK: 'The provider could not be reached from the server.',
      PROVIDER_ERROR: 'The provider could not process this audio.',
      UNSUPPORTED_TYPE: 'That file type is not supported. Try MP3, WAV, M4A, WebM, OGG or FLAC.',
      TOO_LARGE: 'That file is too large for this deployment.',
      RATE_LIMIT: 'Too many transcription requests. Wait a moment and try again.',
      NO_ENGINE: 'No speech-to-text engine is configured on the server.',
      BLOB_DISABLED: 'Large-file uploads are not enabled on this deployment.',
    },
  },

  /* -------------------------------------------------------------- settings */
  settings: {
    metaTitle: 'Settings',
    metaDescription:
      'Connect your own Deepgram, Gladia, AssemblyAI or Speechmatics key, test it, and disconnect it again. Keys stay in an httpOnly cookie on your device.',
    heading: 'Connect an engine',
    subheading:
      'Paste a provider key to run this app on your own account — no environment variables, no redeploy. Test it before you rely on it, and disconnect whenever you like.',
    connectionsHeading: 'Engine connections',
    loading: 'Reading your connections…',
    loadErrorTitle: 'Your connections could not be read',
    noEngines: 'This deployment exposes no engines.',
    summary: {
      connected: '{connected} of {total} engines connected',
      chain: 'failover chain: {chain}',
    },
    actions: {
      save: 'Save & test',
      test: 'Test connection',
      disconnect: 'Disconnect',
      disconnectAll: 'Disconnect all',
      disable: 'Disable here',
      enable: 'Re-enable',
    },
    source: {
      settings: 'Your key',
      environment: 'Deployment key',
      disabled: 'Disabled here',
      none: 'Not connected',
    },
    input: {
      label: '{engine} API key',
      placeholder: 'Paste your {engine} API key',
      reveal: 'Show the key while typing',
      hide: 'Hide the key',
    },
    result: {
      OK: 'Connected — {engine} accepted the key.',
      REJECTED: 'The provider rejected this key. Check for a typo, or that it belongs to the right region.',
      FORBIDDEN: 'The key works but may not read this endpoint.',
      NO_CREDIT: 'The account is out of credit. Top it up and test again.',
      RATE_LIMITED: 'The provider is rate limiting this account. Wait a moment and retry.',
      TIMEOUT: 'The provider did not answer in time. Check the connection and retry.',
      UNREACHABLE: 'The provider could not be reached from this server.',
      UNEXPECTED: 'The provider answered something unexpected — the key may still work.',
      PROVIDER_ERROR: 'The provider reported a server-side error. Retry in a moment.',
      MISSING_KEY: 'Add a key first, then test.',
      DISABLED: 'Disabled for this browser. The deployment key is ignored here.',
      ENABLED: 'Re-enabled for this browser.',
      DISCONNECTED: 'Key removed from this device.',
      DISCONNECTED_ALL: 'Every stored key was removed from this device.',
      NOT_CONNECTED: 'Nothing was stored for that engine.',
    },
    invalid: {
      empty: 'The key is empty.',
      'too-short': 'That is too short to be a key — check the copy.',
      'too-long': 'That is longer than any provider key — check the copy.',
      whitespace: 'Remove the spaces or line breaks from the key.',
      quotes: 'Remove the surrounding quotes.',
      prefix: 'Paste the raw key, without a "Bearer" or "Token" prefix.',
      placeholder: 'That looks like the placeholder from the docs, not a real key.',
      'unknown-engine': 'That engine is not supported here.',
      network: 'The request could not be sent. Check your connection and retry.',
      unknown: 'The key was not accepted.',
    },
    hint: {
      environment:
        'This key comes from the deployment ({var}). It cannot be deleted from a browser — you can disable it here instead.',
      disabled: 'The deployment key exists but is switched off for this browser.',
      settings: 'Stored on this device only. Saving again replaces it.',
      empty: 'Paste a key to enable this engine, or set {var} in the deployment.',
    },
    links: {
      dashboard: 'Provider dashboard ↗',
      docs: 'API docs ↗',
      studio: 'Open the transcriber →',
      engines: 'How each engine works →',
      usage: 'Check remaining limits →',
    },
    facts: {
      heading: 'Where keys are kept',
      storageTitle: 'On your device, not on the server',
      storageBody:
        'A key saved here lives in an httpOnly cookie for this site, so page scripts cannot read it back and no database ever holds it. This server sees it only to call the provider for you.',
      precedenceTitle: 'Your key wins',
      precedenceBody:
        'When this browser holds a key for an engine it is used instead of the deployment key. Everything else — models, timeouts, failover order — stays deployment-controlled.',
      warningTitle: 'Not for shared computers',
      warningBody:
        'Anyone using this browser profile can spend the credits connected here. On a shared machine, disconnect when you are done.',
    },
    deploy: {
      heading: 'Deploying it yourself?',
      body: 'On your own deployment the keys belong in environment variables, where they serve every visitor and never pass through a browser. Copy .env.local.example and restart the server.',
      blob: 'Vercel Blob large-file uploads: {enabled}.',
    },
  },

  /* ---------------------------------------------------------------- footer */
  footer: {
    blurb:
      'Next.js App Router, Tailwind CSS v4, and four speech engines behind a server-side proxy with automatic failover.',
    privacy: 'Bring your own API keys — nothing is logged or stored.',
    builtWith: 'Built with',
    nav: 'Pages',
    resources: 'Providers',
    install: 'Install the app',
    rights: 'MIT licensed · free to self-host',
    offlineready: 'Works offline',
  },
};

export default en;
