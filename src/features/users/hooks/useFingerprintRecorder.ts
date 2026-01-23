"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseFingerprintRecorderReturn = {
  /** Whether recording is in progress */
  isRecording: boolean;
  /** Whether recorder is initializing */
  isInitializing: boolean;
  /** Duration in seconds */
  durationSec: number;
  /** Duration formatted as "0:XX" */
  durationFormatted: string;
  /** Audio level (0-1) for visualization */
  audioLevel: number;
  /** Error message if any */
  error: string | null;
  /** Recorded audio blob (available after stop) */
  recordedBlob: Blob | null;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and get blob */
  stopRecording: () => void;
  /** Reset state for new recording */
  reset: () => void;
};

/**
 * Hook for recording voice fingerprints.
 * Uses MediaRecorder API with audio/webm format.
 * Includes audio level visualization.
 */
export function useFingerprintRecorder(): UseFingerprintRecorderReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Audio level visualization
  // ---------------------------------------------------------------------------
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(1, average / 128);
    setAudioLevel(normalizedLevel);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------
  const startTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setDurationSec(0);
    timerRef.current = window.setInterval(() => {
      setDurationSec((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Start recording
  // ---------------------------------------------------------------------------
  const startRecording = useCallback(async () => {
    if (isRecording || isInitializing) return;

    setError(null);
    setRecordedBlob(null);
    setIsInitializing(true);
    chunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analysis for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create MediaRecorder
      const mimeType = "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        // Combine all chunks into a single blob
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        chunksRef.current = [];
      };

      recorder.onerror = (ev) => {
        console.error("MediaRecorder error", ev);
        setError("Recording failed. Please try again.");
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimer();

      // Start audio level visualization
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Could not access microphone. Please check your permissions.");
    } finally {
      setIsInitializing(false);
    }
  }, [isRecording, isInitializing, startTimer, updateAudioLevel]);

  // ---------------------------------------------------------------------------
  // Stop recording
  // ---------------------------------------------------------------------------
  const stopRecording = useCallback(() => {
    stopTimer();
    setIsRecording(false);
    setAudioLevel(0);

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop MediaRecorder
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;

    // Close audio context
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [stopTimer]);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    stopRecording();
    setDurationSec(0);
    setRecordedBlob(null);
    setError(null);
  }, [stopRecording]);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      stopTimer();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopTimer]);

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    isRecording,
    isInitializing,
    durationSec,
    durationFormatted,
    audioLevel,
    error,
    recordedBlob,
    startRecording,
    stopRecording,
    reset,
  };
}