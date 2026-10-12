/**
 * components/Waveform.js
 * ---------------------------------------------------------------------------
 * Two tiny presentational visualisers:
 *   • <Waveform>    — static peak bars decoded from a loaded clip
 *   • <LevelMeter>  — live input bars driven by the recorder's analyser
 */

const barsFrom = (values, fallback, count) => {
  if (Array.isArray(values) && values.length) return values;
  return new Array(count).fill(fallback);
};

export function Waveform({ peaks, isDecoding = false, className = '', height = 56 }) {
  const bars = barsFrom(peaks, 0.1, 96);
  const placeholder = !peaks;

  return (
    <div
      className={`flex w-full items-center gap-[2px] ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {bars.map((value, index) => (
        <span
          key={index}
          className={`flex-1 rounded-full ${
            placeholder
              ? 'animate-shimmer bg-gradient-to-r from-surface-3 via-ink-500/40 to-surface-3 bg-[length:200%_100%]'
              : 'bg-gradient-to-t from-iris-600/60 via-iris-400 to-mint-400/90'
          }`}
          style={
            placeholder
              ? { height: isDecoding ? `${18 + (index % 5) * 6}%` : '18%' }
              : { height: `${Math.round(value * 100)}%` }
          }
        />
      ))}
    </div>
  );
}

export function LevelMeter({ levels, isActive, className = '', height = 72 }) {
  const bars = barsFrom(levels, 0.06, 28);

  return (
    <div
      className={`flex w-full items-center gap-[3px] ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {bars.map((value, index) => (
        <span
          key={index}
          className={`w-full flex-1 rounded-full transition-[height,background-color] duration-75 ease-out ${
            isActive
              ? 'bg-gradient-to-t from-mint-500/70 via-mint-400 to-iris-300'
              : 'bg-surface-3'
          }`}
          style={{ height: isActive ? `${Math.max(6, Math.round(value * 100))}%` : '8%' }}
        />
      ))}
    </div>
  );
}
