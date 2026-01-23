import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Build the WebSocket URL from the configured API base.
 */
function buildWebSocketUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";
  return base.replace(/^http/, "ws") + "/ws/stream";
}

// User-selectable recording type
export type RecordingMode = "audio" | "video";

// User-selectable context for the session
export type SessionContext = "practice" | "game";

// Shape of the "saved" payload we expect from the backend
export type SavedMedia = {
  id: number;
  filename: string;
  filepath: string;
  media_type: string;
  mime_type: string | null;
  created_at: string;
  url?: string | null;
};

type UseRecordingOptions = {
  /** Callback when recording finishes (for analytics, etc.) */
  onFinish?: () => void;
};

type UseRecordingReturn = {
  /** Current session context (practice or game) */
  sessionContext: SessionContext;
  /** Set the session context */
  setSessionContext: (context: SessionContext) => void;
  /** Current recording mode (audio or video) */
  mode: RecordingMode;
  /** Set the recording mode */
  setMode: (mode: RecordingMode) => void;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether recording is starting (prevents double-taps) */
  isStarting: boolean;
  /** Duration in seconds */
  durationSec: number;
  /** Duration formatted as "X:XX" */
  durationFormatted: string;
  /** Error message if something went wrong */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
  /** Ref for the video preview element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => void;
  /** Toggle recording on/off */
  toggleRecording: () => void;
  /** Handle finish button - navigates to Learn */
  handleFinish: () => void;
};

/**
 * Custom hook for managing recording state and logic.
 * Handles media streams, WebSocket communication, and navigation.
 */
export function useRecording({
  onFinish,
}: UseRecordingOptions = {}): UseRecordingReturn {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [sessionContext, setSessionContext] = useState<SessionContext>("practice");
  const [mode, setMode] = useState<RecordingMode>("audio");
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedMedia, setSavedMedia] = useState<SavedMedia | null>(null);
  const [pendingFinish, setPendingFinish] = useState(false);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // IMPORTANT: Use refs for values accessed in WebSocket callbacks
  // This avoids stale closure issues
  const pendingFinishRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const routerRef = useRef(router);

  // Keep refs in sync with current values
  useEffect(() => {
    pendingFinishRef.current = pendingFinish;
  }, [pendingFinish]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // ---------------------------------------------------------------------------
  // Navigation helper (uses refs to avoid stale closures)
  // ---------------------------------------------------------------------------

  const goToLearn = useCallback((media?: SavedMedia | null) => {
    let path = "/user/learn";
    if (media) {
      const base = `/user/learn?mediaId=${media.id}`;
      if (media.url) {
        path = `${base}&mediaUrl=${encodeURIComponent(media.url)}`;
      } else {
        path = base;
      }
    }
    onFinishRef.current?.();
    routerRef.current.push(path);
  }, []);

  // ---------------------------------------------------------------------------
  // Timer helpers
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
  // Recording control
  // ---------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (isRecording || isStarting) return;
    setError(null);
    setIsStarting(true);

    try {
      // Request media devices
      const constraints: MediaStreamConstraints =
        mode === "audio" ? { audio: true } : { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach to video preview if video mode
      if (mode === "video" && videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {});
      }

      const mimeType = mode === "audio" ? "audio/webm" : "video/webm";

      // Open WebSocket
      const wsUrl = buildWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // IMPORTANT: This handler uses refs to access current values
      // and avoid stale closure issues
      ws.onmessage = (ev: MessageEvent) => {
        if (typeof ev.data !== "string") return;
        try {
          const data = JSON.parse(ev.data);
          if (data?.event === "saved") {
            const media: SavedMedia = {
              id: data.id,
              filename: data.filename,
              filepath: data.filepath,
              media_type: data.media_type,
              mime_type: data.mime_type ?? null,
              created_at: data.created_at,
              url: data.url ?? null,
            };
            setSavedMedia(media);

            // If the user pressed Finish while we were still finalizing,
            // complete the navigation now that we know the media id/url.
            if (pendingFinishRef.current) {
              setPendingFinish(false);
              goToLearn(media);
            }
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message", err);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error", event);
        setError("There was a problem talking to the recording server.");
      };

      ws.onopen = () => {
        // Tell backend that a new stream is about to start
        ws.send(
          JSON.stringify({
            event: "start",
            extension: "webm",
            kind: mode,
            mimeType,
            context: sessionContext,
            recordingMode: mode,
          })
        );

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (ev: BlobEvent) => {
          if (!ev.data || ev.data.size === 0) return;
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          try {
            const buffer = await ev.data.arrayBuffer();
            wsRef.current.send(buffer);
          } catch (err) {
            console.error("Failed to send media chunk", err);
          }
        };

        recorder.onerror = (ev) => {
          console.error("MediaRecorder error", ev.error);
          setError("There was a problem while recording.");
        };

        // Request a new chunk roughly every second
        recorder.start(1000);
        setIsRecording(true);
        startTimer();
        setIsStarting(false);
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (err) {
      console.error("Failed to start recording", err);
      setError("Could not start recording. Please check your mic/camera permissions.");
      setIsStarting(false);
    }
  }, [isRecording, isStarting, mode, sessionContext, startTimer, goToLearn]);

  const stopRecording = useCallback(() => {
    stopTimer();
    setIsRecording(false);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;

    // Tell backend we are done with the stream, but keep the WebSocket
    // open so we can receive the final "saved" payload.
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "end" }));
    }

    // Turn off the live preview and free camera/microphone
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [stopTimer]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleFinish = useCallback(() => {
    setError(null);

    if (isRecording) {
      setPendingFinish(true);
      stopRecording();
      return;
    }

    if (savedMedia) {
      goToLearn(savedMedia);
      return;
    }

    // No recording yet; just navigate to Learn baseline
    goToLearn(null);
  }, [isRecording, savedMedia, stopRecording, goToLearn]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      stopTimer();

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [stopTimer]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    sessionContext,
    setSessionContext,
    mode,
    setMode,
    isRecording,
    isStarting,
    durationSec,
    durationFormatted,
    error,
    clearError,
    videoRef,
    startRecording,
    stopRecording,
    toggleRecording,
    handleFinish,
  };
}