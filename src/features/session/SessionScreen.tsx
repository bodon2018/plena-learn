"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import {
  Play,
  Pause,
  Mic,
  Video,
  CheckCircle2,
  TriangleAlert,
  Activity,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";

// User-selectable recording type
type RecordingMode = "audio" | "video";

// User-selectable context for the session
type SessionContext = "practice" | "game";

// Shape of the "saved" payload we expect from the backend
type SavedMedia = {
  id: number;
  filename: string;
  filepath: string;
  media_type: string;
  mime_type: string | null;
  created_at: string;
  url?: string | null;
};

type Props = {
  /**
   * Optional callback if a parent component wants to react
   * when the user finishes recording (e.g. logging, analytics).
   */
  onFinish?: () => void;
};

/**
 * Visual label used in the blue info box to show tone.
 */
function ToneBadge({ tone }: { tone?: "Win" | "Progress" | "Urgent" | "Info" }) {
  const cls =
    tone === "Win"
      ? "bg-success/15 text-success"
      : tone === "Progress"
      ? "bg-secondary/15 text-secondary"
      : tone === "Urgent"
      ? "bg-danger/15 text-danger"
      : "bg-sky/15 text-sky";
  return <span className={cn("rounded-md px-2 py-0.5 text-xs", cls)}>{tone ?? "Info"}</span>;
}

/**
 * Small icon next to the tone badge.
 */
function ToneIcon({ tone }: { tone?: "Win" | "Progress" | "Urgent" | "Info" }) {
  if (tone === "Win") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "Progress") return <Activity className="h-4 w-4" />;
  if (tone === "Urgent") return <TriangleAlert className="h-4 w-4" />;
  return <CheckCircle className="h-4 w-4" />;
}

/**
 * Blue message box at the top of the Session screen.
 */
function SessionMessageBox({
  header,
  body,
  tone,
}: {
  header: string;
  body: React.ReactNode;
  tone?: "Win" | "Progress" | "Urgent" | "Info";
}) {
  return (
    <div className="animate-fade-up rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-neutral-600">
        <ToneIcon tone={tone} />
        <span>{header}</span>
        <span className="ml-auto">
          <ToneBadge tone={tone} />
        </span>
      </div>
      <div className="text-base font-medium leading-snug">{body}</div>
    </div>
  );
}

/**
 * Simple animated bars to show that audio is being captured.
 */
function MicWave() {
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-5 w-[6px] animate-pulse rounded bg-primary/70"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Build the WebSocket URL from the configured API base.
 * - In dev, NEXT_PUBLIC_API_BASE_URL can point to http://127.0.0.1:8000
 * - We swap http -> ws so FastAPI's /ws/stream can be used.
 */
function buildWebSocketUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";
  return base.replace(/^http/, "ws") + "/ws/stream";
}

export default function SessionScreen({ onFinish }: Props) {
  const router = useRouter();

  // --- UX state --------------------------------------------------------------

  // Practice vs Game context
  const [sessionContext, setSessionContext] = useState<SessionContext>("practice");

  // Audio or Video recording mode
  const [mode, setMode] = useState<RecordingMode>("audio");

  // Recording state + duration tracking
  const [recording, setRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  // Error message for permission / network issues
  const [error, setError] = useState<string | null>(null);

  // Prevent double-taps on the record button while we are starting
  const [isStarting, setIsStarting] = useState(false);

  // Latest media that was successfully saved by the backend
  const [savedMedia, setSavedMedia] = useState<SavedMedia | null>(null);

  // If true, user pressed "Finish" while we still needed to finalize the recording.
  // Once we see the "saved" event, we auto-navigate.
  const [pendingFinish, setPendingFinish] = useState(false);
  const pendingFinishRef = useRef(false);
  useEffect(() => {
    pendingFinishRef.current = pendingFinish;
  }, [pendingFinish]);

  // --- Media / network refs --------------------------------------------------

  // Browser media stream for microphone (and camera, if video)
  const streamRef = useRef<MediaStream | null>(null);

  // MediaRecorder responsible for producing chunks from the stream
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // WebSocket connection to FastAPI /ws/stream
  const wsRef = useRef<WebSocket | null>(null);

  // Timer ID used to update duration every second
  const timerRef = useRef<number | null>(null);

  // Video element used for live preview when mode === "video"
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // --- Duration helpers ------------------------------------------------------

  /**
   * Start a 1s interval to increment the duration counter.
   */
  const startTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setDurationSec(0);
    timerRef.current = window.setInterval(() => {
      setDurationSec((prev) => prev + 1);
    }, 1000);
  };

  /**
   * Stop the duration timer.
   */
  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // --- Navigation helper -----------------------------------------------------

  /**
   * Navigate to the Learn tab (currently /user/summary).
   * If we have media info, pass mediaId and mediaUrl via query params
   * so Learn can open the exact recording.
   */
  const goToLearn = (media?: SavedMedia | null) => {
    let path = "/user/summary";
    if (media) {
      const base = `/user/summary?mediaId=${media.id}`;
      if (media.url) {
        path = `${base}&mediaUrl=${encodeURIComponent(media.url)}`;
      } else {
        path = base;
      }
    }
    onFinish?.();
    router.push(path);
  };

  // --- Recording control -----------------------------------------------------

  /**
   * Start recording:
   * - Ask for mic (and camera) permissions.
   * - Open WebSocket connection to FastAPI.
   * - Tell the backend we are starting a stream.
   * - Start MediaRecorder and send chunks to the server.
   * - If in video mode, show a live preview of the camera.
   */
  const startRecording = async () => {
    if (recording || isStarting) return;
    setError(null);
    setIsStarting(true);

    try {
      // 1) Request media devices based on the selected mode
      const constraints: MediaStreamConstraints =
        mode === "audio" ? { audio: true } : { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // 2) If we are in video mode, attach the stream to the <video> element
      if (mode === "video" && videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {});
      }

      // Browser recording container type; backend converts webm -> mp4/mp3
      const mimeType = mode === "audio" ? "audio/webm" : "video/webm";

      // 3) Open WebSocket to the recording endpoint
      const wsUrl = buildWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      /**
       * Listen for the server's response. When the backend finishes
       * saving and returns a "saved" event, we stash the media info
       * and optionally navigate if the user already pressed Finish.
       */
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
        // 4) Tell backend that a new stream is about to start
        ws.send(
          JSON.stringify({
            event: "start",
            extension: "webm",
            kind: mode,
            mimeType,
            context: sessionContext,
            // Explicit recordingMode so backend can store audio vs video cleanly
            recordingMode: mode,
          }),
        );

        // 5) Start MediaRecorder and pipe data into WebSocket frames
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
        setRecording(true);
        startTimer();
        setIsStarting(false);
      };

      ws.onclose = () => {
        // When the server closes the socket (e.g. after saving),
        // we just clear the ref; timer/recording state are driven
        // by our own stopRecording logic.
        wsRef.current = null;
      };
    } catch (err) {
      console.error("Failed to start recording", err);
      setError("Could not start recording. Please check your mic/camera permissions.");
      setIsStarting(false);
    }
  };

  /**
   * Stop recording:
   * - Stop the MediaRecorder.
   * - Send an "end" event to the backend but DO NOT close the socket.
   *   The server will finish processing, send "saved", then close.
   * - Release camera/mic and clear live preview.
   */
  const stopRecording = () => {
    // Stop duration counter and mark us as not recording
    stopTimer();
    setRecording(false);

    // Stop the MediaRecorder if it is still running
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (videoRef.current as any).srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  /**
   * Handler for the round record/pause button.
   * If we are not recording, start; if we are, stop.
   */
  const handleRecordToggle = () => {
    if (recording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  /**
   * Handler for the "Finish" button:
   * - If we are still recording, stop and mark finish as pending.
   *   Navigation will happen when "saved" arrives from the backend.
   * - If we already have a saved media, navigate immediately with id/url.
   * - If nothing was recorded yet, just go to Learn without mediaId.
   */
  const handleFinish = () => {
    setError(null);

    if (recording) {
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
  };

  /**
   * Cleanup when the user navigates away from this page.
   * This runs only on unmount and releases all media + network resources.
   */
  useEffect(() => {
    return () => {
      // Stop the timer if it is still running
      stopTimer();

      // Stop the media recorder if active
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;

      // Release camera/mic tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Clear video preview
      if (videoRef.current) {
        videoRef.current.pause();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (videoRef.current as any).srcObject = null;
      }

      // Close the WebSocket if it is still open
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const durationLabel = `${minutes} min ${seconds} sec`;

  return (
    <>
      <AppBar title="Start Session" />

      {/* Welcome message explaining what this screen is for */}
      <Card className="mb-4">
        <SessionMessageBox
          header="Welcome"
          tone="Info"
          body={
            <span>
              Record your games and/or practices. Choose whether this session is a practice or a game,
              then pick audio or video and start recording.
            </span>
          }
        />
      </Card>

      {/* Context selector: Practice vs Game */}
      <Card className="mb-4">
        <h2 className="text-lg font-semibold">What is the context of this session?</h2>
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="context"
              value="practice"
              checked={sessionContext === "practice"}
              onChange={() => setSessionContext("practice")}
            />
            <span>Practice</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="context"
              value="game"
              checked={sessionContext === "game"}
              onChange={() => setSessionContext("game")}
            />
            <span>Game</span>
          </label>
        </div>
      </Card>

      {/* Recording mode selector + live video preview */}
      <Card className="mb-4">
        <h2 className="text-lg font-semibold">How would you like to record?</h2>
        <div className="mt-3 inline-flex rounded-full bg-neutral-100 p-1">
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-sm",
              mode === "audio"
                ? "bg-white shadow-sm text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800",
            )}
            onClick={() => setMode("audio")}
            disabled={recording}
          >
            <Mic className="h-4 w-4" />
            Audio
          </button>
          <button
            type="button"
            className={cn(
              "ml-1 flex items-center gap-1 rounded-full px-3 py-1 text-sm",
              mode === "video"
                ? "bg-white shadow-sm text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800",
            )}
            onClick={() => setMode("video")}
            disabled={recording}
          >
            <Video className="h-4 w-4" />
            Video
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          You can always choose audio only if you prefer not to use the camera.
        </p>

        {/* Live preview appears only when in video mode */}
        {mode === "video" && (
          <div className="mt-4">
            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Live preview of your camera. This is what will be recorded.
            </p>
          </div>
        )}
      </Card>

      {/* Error banner, if something went wrong (permissions/network) */}
      {error && (
        <div className="mb-3 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Bottom recording bar with record button, status, and Finish */}
      <div className="sticky bottom-20 mt-4 flex items-center justify-between rounded-2xl border bg-white/80 p-4 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl text-white",
              recording ? "bg-danger" : "bg-primary",
            )}
            onClick={handleRecordToggle}
            aria-label={recording ? "Stop recording" : "Start recording"}
            disabled={isStarting}
            type="button"
          >
            {recording ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          {recording ? (
            <div className="flex items-center gap-2">
              {mode === "audio" ? (
                <>
                  <Mic className="h-4 w-4 text-primary" />
                  <MicWave />
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary">Recording video…</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-neutral-400">
              {isStarting ? "Starting…" : "Not recording"}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-500">Duration: {durationLabel}</div>

        <button type="button" className="btn-outline" onClick={handleFinish}>
          Finish
        </button>
      </div>
    </>
  );
}
