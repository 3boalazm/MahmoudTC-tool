/**
 * Inline SVG icon set — no icon dependency, no extra bytes over the wire.
 * Every icon inherits `currentColor` and accepts standard SVG props.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function MicIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v2.5M9 20.5h6" />
    </svg>
  );
}

export function LinkIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </svg>
  );
}

export function UploadIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V4.5m0 0 3.6 3.6M12 4.5 8.4 8.1" />
      <path d="M4.5 14v3.5A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5V14" />
    </svg>
  );
}

export function StopIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlayIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8.5 5.6a1 1 0 0 1 1.52-.85l7.2 4.4a1 1 0 0 1 0 1.7l-7.2 4.4a1 1 0 0 1-1.52-.85Z" />
    </svg>
  );
}

export function CopyIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="9" width="10.5" height="10.5" rx="2.4" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 5.5 15" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.8 4.2 4.2L19 7.2" />
    </svg>
  );
}

export function DownloadIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11m0 0 3.6-3.6M12 15l-3.6-3.6" />
      <path d="M4.5 17v1.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V17" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.8 7h14.4M9.5 7V5.6A1.6 1.6 0 0 1 11.1 4h1.8a1.6 1.6 0 0 1 1.6 1.6V7" />
      <path d="M6.6 7l.8 11.1A2 2 0 0 0 9.4 20h5.2a2 2 0 0 0 2-1.9L17.4 7" />
      <path d="M10.5 11v5M13.5 11v5" />
    </svg>
  );
}

export function SpinnerIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" strokeWidth="2.1" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.6 5.5 6v5.4c0 4.2 2.7 7.3 6.5 9 3.8-1.7 6.5-4.8 6.5-9V6Z" />
      <path d="m9.2 12.1 2 2 3.6-3.9" />
    </svg>
  );
}

export function BoltIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13.4 3 6.8 13.2h4.1L9.9 21l6.9-10.4h-4.2Z" />
    </svg>
  );
}

export function WaveIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 12h1.8M8 6.8v10.4M12 4v16M16 8.2v7.6M20.5 12h-1.8" />
    </svg>
  );
}

export function AlertIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 8.6v4.6" />
      <circle cx="12" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
      <path d="M10.2 4.9 3.3 17.4A2 2 0 0 0 5 20.4h14a2 2 0 0 0 1.7-3L13.8 4.9a2 2 0 0 0-3.6 0Z" />
    </svg>
  );
}

export function LayersIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3.5 8 4.2-8 4.2-8-4.2Z" />
      <path d="m4.6 12.4 7.4 3.9 7.4-3.9" />
      <path d="m4.6 16.4 7.4 3.9 7.4-3.9" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.6V12l3 1.8" />
    </svg>
  );
}

export function GlobeIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.8 12h16.4" />
      <path d="M12 3.6c2.2 2.4 3.3 5.3 3.3 8.4S14.2 18 12 20.4C9.8 18 8.7 15.1 8.7 12S9.8 6 12 3.6Z" />
    </svg>
  );
}

export function SparkIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7Z" />
      <path d="M18.4 15.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4" />
    </svg>
  );
}

export function FileAudioIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13.5 3.5H8A2.5 2.5 0 0 0 5.5 6v12A2.5 2.5 0 0 0 8 20.5h8a2.5 2.5 0 0 0 2.5-2.5V8.5Z" />
      <path d="M13.4 3.6V8.4h4.9" />
      <path d="M11 16.4V12l3.4-.9v4.3" />
      <circle cx="10.1" cy="16.6" r="1.1" />
      <circle cx="13.5" cy="15.7" r="1.1" />
    </svg>
  );
}

export function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.11A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.11A1.7 1.7 0 0 0 19.4 15Z"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KeyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.9 12.1 8.1-8.1M16 3h5v5M14.5 8.5 18 12" strokeLinecap="round" />
    </svg>
  );
}

export function PlugIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9ZM12 18v3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.7 6.7C4.6 8 3 10 2 12c2 4 5.9 7 10 7 1.7 0 3.3-.4 4.7-1.2M9.9 5.3A10.6 10.6 0 0 1 12 5c4.1 0 8 3 10 7-.5 1-1.2 2-2 2.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
