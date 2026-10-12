'use client';

/**
 * hooks/useRecorder.js
 * ---------------------------------------------------------------------------
 * MediaRecorder wrapper exposed as a React hook.
 *
 * Handles: permission errors, codec negotiation across browsers, a live level
 * meter (Web Audio `AnalyserNode`), a wall-clock timer, pause/resume, and full
 * teardown of the media tracks on unmount so the microphone indicator always
 * goes away.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/**
 * Pick a container the current browser can actually record.
 * Chrome/Edge/Firefox → WebM/Opus, Safari → MP4/AAC. All of these are accepted
 * by both Deepgram and Gladia.
 */
export const RECORDER_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
];

export function pickRecorderMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return '';
  }
  for (const type of RECORDER_CANDIDATES) {
    try {
      if (window.MediaRecorder.isTypeSupported?.(type)) return type;
    } catch {
      /* keep probing */
    }
  }
  return '';
}

const extensionForMime = (mimeType = '') => {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
};

const HUMAN_ERRORS = {
  NotAllowedError:
    'Microphone permission was denied. Allow access in your browser settings and try again.',
  PermissionDeniedError:
    'Microphone permission was denied. Allow access in your browser settings and try again.',
  NotFoundError: 'No microphone was found on this device.',
  DevicesNotFoundError: 'No microphone was found on this device.',
  NotReadableError:
    'The microphone is already in use by another application. Close it and try again.',
  TrackStartError:
    'The microphone is already in use by another application. Close it and try again.',
  OverconstrainedError: 'The selected microphone does not support the requested settings.',
  SecurityError: 'Microphone access requires a secure (https) connection.',
  AbortError: 'Microphone access was interrupted. Please try again.',
};

const BAR_COUNT = 28;

/**
 * Browser-capability check read through `useSyncExternalStore`, which is the
 * React-sanctioned way to read a value that only exists on the client: the
 * server-rendered markup assumes support, and the first client render corrects
 * it without a hydration warning or a cascading effect.
 */
const subscribeToNothing = () => () => {};

function mediaRecorderSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function useRecorder() {
  const [status, setStatus] = useState('idle'); // idle | requesting | recording | paused | stopping
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState(() => new Array(BAR_COUNT).fill(0.06));
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(null); // { blob, url, mimeType, extension, durationSeconds }
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    mediaRecorderSupported,
    () => true,
  );

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef(0);
  const tickRef = useRef(null);
  const objectUrlRef = useRef(null);

  /* --------------------------------------------------------------- cleanup */
  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;

    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  /* ------------------------------------------------------------ level meter */
  const startMeter = useCallback((stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioContextRef.current = context;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const paint = () => {
        analyser.getByteFrequencyData(data);
        const perBar = Math.floor(data.length / BAR_COUNT);
        const next = new Array(BAR_COUNT);
        for (let bar = 0; bar < BAR_COUNT; bar += 1) {
          let sum = 0;
          for (let i = 0; i < perBar; i += 1) sum += data[bar * perBar + i];
          const average = sum / perBar / 255;
          // Slight curve so quiet speech still moves the bars.
          next[bar] = Math.max(0.06, Math.min(1, average ** 0.75 * 1.35));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(paint);
      };
      paint();
    } catch {
      /* A missing analyser only costs us the meter — recording still works. */
    }
  }, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setLevels(new Array(BAR_COUNT).fill(0.06));
  }, []);

  /* ------------------------------------------------------------ timer loop */
  const startTicker = useCallback(() => {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const paused = pausedTotalRef.current + (pausedAtRef.current ? now - pausedAtRef.current : 0);
      setElapsed((now - startedAtRef.current - paused) / 1000);
    }, 100);
  }, []);

  /* ---------------------------------------------------------------- actions */
  const start = useCallback(async () => {
    if (!isSupported) {
      setError('This browser does not support in-browser recording. Try uploading a file instead.');
      return null;
    }

    setError(null);
    setStatus('requesting');
    setElapsed(0);
    pausedTotalRef.current = 0;
    pausedAtRef.current = 0;
    chunksRef.current = [];

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (mediaError) {
      const message =
        HUMAN_ERRORS[mediaError?.name] ||
        mediaError?.message ||
        'The microphone could not be started.';
      setError(message);
      setStatus('idle');
      return null;
    }

    streamRef.current = stream;
    const mimeType = pickRecorderMimeType();

    let recorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 })
        : new MediaRecorder(stream);
    } catch (recorderError) {
      teardown();
      setError(
        `Recording could not be initialised in this browser${
          recorderError?.message ? ` (${recorderError.message})` : ''
        }.`,
      );
      setStatus('idle');
      return null;
    }

    mediaRecorderRef.current = recorder;
    const effectiveMime = recorder.mimeType || mimeType || 'audio/webm';

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onerror = (event) => {
      setError(event?.error?.message || 'The recorder reported an unexpected error.');
      teardown();
      setStatus('idle');
    };

    recorder.onstop = () => {
      const recordedMs = Date.now() - startedAtRef.current - pausedTotalRef.current;
      const blob = new Blob(chunksRef.current, { type: effectiveMime });
      chunksRef.current = [];

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      if (blob.size > 0) {
        setRecording({
          blob,
          url,
          mimeType: effectiveMime,
          extension: extensionForMime(effectiveMime),
          durationSeconds: Math.max(0.4, recordedMs / 1000),
        });
      } else {
        setError('The recording came out empty. Check your microphone input level.');
      }

      teardown();
      setStatus('idle');
    };

    startMeter(stream);
    startedAtRef.current = Date.now();
    recorder.start(250); // emit a chunk every 250ms for resilience
    setStatus('recording');
    startTicker();

    return recorder;
  }, [isSupported, startMeter, startTicker, teardown]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setStatus('stopping');
    stopMeter();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    try {
      if (recorder.state !== 'inactive') recorder.stop();
    } catch {
      teardown();
      setStatus('idle');
    }
  }, [stopMeter, teardown]);

  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    try {
      if (recorder.state === 'recording') {
        recorder.pause();
        pausedAtRef.current = Date.now();
        setStatus('paused');
      } else if (recorder.state === 'paused') {
        if (pausedAtRef.current) {
          pausedTotalRef.current += Date.now() - pausedAtRef.current;
          pausedAtRef.current = 0;
        }
        recorder.resume();
        setStatus('recording');
      }
    } catch {
      /* pause/resume is best-effort; recording continues regardless */
    }
  }, []);

  /** Discard the recorded clip and free its object URL. */
  const discard = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setRecording(null);
    setElapsed(0);
    setError(null);
    setStatus('idle');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const isRecording = status === 'recording' || status === 'paused' || status === 'stopping';

  return useMemo(
    () => ({
      status,
      elapsed,
      levels,
      error,
      recording,
      isSupported,
      isRecording,
      start,
      stop,
      togglePause,
      discard,
      clearError,
    }),
    [status, elapsed, levels, error, recording, isSupported, isRecording, start, stop, togglePause, discard, clearError],
  );
}
