'use client';

/**
 * hooks/useAudioSource.js
 * ---------------------------------------------------------------------------
 * Owns "the audio clip currently loaded in the studio" regardless of whether it
 * came from a file picker or the microphone.
 *
 * Responsibilities:
 *   • create and always revoke the object URL used for playback
 *   • decode the clip to a compact peak array so the UI can draw a real waveform
 *   • recover the clip duration when the browser can determine it
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const PEAK_BUCKETS = 112;
/** Decoding is memory-hungry; skip it for long files and show a flat bar. */
const MAX_DECODE_BYTES = 8 * 1024 * 1024;

function computePeaks(bufferData, buckets) {
  const { length } = bufferData;
  if (!length) return null;
  const step = Math.max(1, Math.floor(length / buckets));
  const peaks = new Array(buckets);
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = bucket * step;
    const end = Math.min(length, start + step);
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const value = Math.abs(bufferData[i]);
      if (value > peak) peak = value;
    }
    peaks[bucket] = peak;
  }
  const loudest = Math.max(...peaks, 0.0001);
  return peaks.map((value) => Math.max(0.04, Math.min(1, value / loudest)));
}

export function useAudioSource() {
  const [audio, setAudio] = useState(null);
  const [peaks, setPeaks] = useState(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const urlRef = useRef(null);
  const audioContextRef = useRef(null);

  const releaseUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  /** Load a File (from the picker) or a Blob (from the recorder). */
  const load = useCallback(
    (blob, meta = {}) => {
      if (!blob) return null;
      releaseUrl();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const next = {
        blob,
        url,
        name: meta.name || blob.name || 'recording',
        size: blob.size ?? 0,
        mimeType: meta.mimeType || blob.type || 'audio/webm',
        durationSeconds: Number.isFinite(meta.durationSeconds) ? meta.durationSeconds : null,
        origin: meta.origin || 'file',
      };
      setPeaks(null);
      setAudio(next);
      return next;
    },
    [releaseUrl],
  );

  const clear = useCallback(() => {
    releaseUrl();
    setAudio(null);
    setPeaks(null);
    setIsDecoding(false);
  }, [releaseUrl]);

  useEffect(() => () => releaseUrl(), [releaseUrl]);

  /* -------------------------------------------------------------- decoding */
  useEffect(() => {
    const blob = audio?.blob;
    if (!blob) return undefined;

    const AudioContextClass =
      typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextClass) return undefined;

    let cancelled = false;

    // Everything happens inside this async runner: `load()` already cleared the
    // previous peaks, so clips we cannot decode simply never produce any.
    const run = async () => {
      if (audio.size > MAX_DECODE_BYTES) return;
      let context;
      try {
        setIsDecoding(true);
        const bytes = await blob.arrayBuffer();
        context = new AudioContextClass();
        audioContextRef.current = context;
        const decoded = await context.decodeAudioData(bytes);
        if (cancelled) return;

        const channel = decoded.getChannelData(0);
        setPeaks(computePeaks(channel, PEAK_BUCKETS));
        setAudio((current) =>
          current && current.url === audio.url && !current.durationSeconds
            ? { ...current, durationSeconds: decoded.duration }
            : current,
        );
      } catch {
        // Some containers (e.g. AMR) cannot be decoded by the browser. The rest
        // of the UI works fine without a waveform.
        if (!cancelled) setPeaks(null);
      } finally {
        setIsDecoding(false);
        audioContextRef.current?.close?.().catch(() => {});
        audioContextRef.current = null;
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [audio?.url, audio?.blob, audio?.size]);


  return { audio, peaks, isDecoding: isDecoding && !peaks, load, clear, setAudio };
}
