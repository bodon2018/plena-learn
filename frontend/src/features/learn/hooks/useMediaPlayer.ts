import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

/**
 * Normalize any media URL so the browser can actually reach it:
 * - If it already starts with http/https, use it as-is.
 * - If it is a relative path (e.g. "/media/recordings/…"), prefix API_BASE.
 */
function normalizeMediaUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const base = API_BASE.replace(/\/$/, "");
  if (url.startsWith("/")) {
    return `${base}${url}`;
  }
  return `${base}/${url}`;
}

/**
 * Format seconds into mm:ss display format.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type UseMediaPlayerOptions = {
  /** Media ID from query params */
  mediaId: string | null;
  /** Direct media URL from query params */
  mediaUrl: string | null;
};

type UseMediaPlayerReturn = {
  /** Resolved URL ready for the media element */
  resolvedUrl: string | null;
  /** Whether the media is video (true) or audio (false) */
  isVideo: boolean;
  /** Whether media is currently playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Current time formatted as mm:ss */
  currentTimeFormatted: string;
  /** Duration formatted as mm:ss */
  durationFormatted: string;
  /** Progress as percentage (0-100) */
  progress: number;
  /** Ref callback to attach to media element */
  setMediaRef: (el: HTMLVideoElement | HTMLAudioElement | null) => void;
  /** Direct access to media element ref */
  mediaRef: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>;
  /** Toggle play/pause */
  togglePlayPause: () => void;
  /** Play the media */
  play: () => void;
  /** Pause the media */
  pause: () => void;
  /** Seek to specific time in seconds */
  seek: (timeSeconds: number) => void;
  /** Seek to specific percentage (0-100) */
  seekToPercent: (percent: number) => void;
  /** Skip forward by seconds */
  skipForward: (seconds?: number) => void;
  /** Skip backward by seconds */
  skipBackward: (seconds?: number) => void;
  /** Handler for media element's loadedmetadata event */
  handleLoadedMetadata: () => void;
  /** Handler for media element's timeupdate event */
  handleTimeUpdate: () => void;
  /** Handler for media element's play event */
  handlePlay: () => void;
  /** Handler for media element's pause event */
  handlePause: () => void;
  /** Handler for media element's ended event */
  handleEnded: () => void;
};

/**
 * Custom hook for managing media playback.
 * Extracts all playback logic from components for reusability.
 * 
 * @example
 * const {
 *   resolvedUrl,
 *   isPlaying,
 *   currentTimeFormatted,
 *   togglePlayPause,
 *   setMediaRef,
 *   handleTimeUpdate,
 *   handleLoadedMetadata,
 * } = useMediaPlayer({ mediaId, mediaUrl });
 */
export function useMediaPlayer({
  mediaId,
  mediaUrl,
}: UseMediaPlayerOptions): UseMediaPlayerReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    normalizeMediaUrl(mediaUrl)
  );
  const [isVideo, setIsVideo] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Ref for the media element (video or audio)
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  // ---------------------------------------------------------------------------
  // URL Resolution
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // If the caller already gave us a URL, normalize and use it.
    if (mediaUrl) {
      setResolvedUrl(normalizeMediaUrl(mediaUrl));
      return;
    }

    // If there is no id, we have nothing to resolve.
    if (!mediaId) {
      setResolvedUrl(null);
      return;
    }

    const controller = new AbortController();

    async function resolveUrl() {
      try {
        const res = await fetch(`${API_BASE}/api/media?media_type=`, {
          signal: controller.signal,
          credentials: "include",
        });
        if (!res.ok) {
          console.error("Failed to list media for URL resolution", res.status);
          return;
        }

        const list = (await res.json()) as Array<{ id: number; url?: string | null }>;
        const match = list.find((m) => String(m.id) === String(mediaId));
        if (match?.url) {
          setResolvedUrl(normalizeMediaUrl(match.url));
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Error resolving media URL", err);
      }
    }

    void resolveUrl();
    return () => controller.abort();
  }, [mediaId, mediaUrl]);

  // ---------------------------------------------------------------------------
  // Detect media type (audio vs video)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!resolvedUrl) {
      setIsVideo(true);
      return;
    }
    const lower = resolvedUrl.toLowerCase();
    const audioLike = /\.(mp3|wav|m4a|aac|ogg)(\?|$)/.test(lower);
    setIsVideo(!audioLike);
  }, [resolvedUrl]);

  // ---------------------------------------------------------------------------
  // Ref setter
  // ---------------------------------------------------------------------------

  const setMediaRef = useCallback(
    (el: HTMLVideoElement | HTMLAudioElement | null) => {
      mediaRef.current = el;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------

  const play = useCallback(() => {
    const el = mediaRef.current;
    if (el) {
      el.play().catch((err) => {
        console.error("Play failed:", err);
      });
    }
  }, []);

  const pause = useCallback(() => {
    const el = mediaRef.current;
    if (el) {
      el.pause();
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((timeSeconds: number) => {
    const el = mediaRef.current;
    if (el && Number.isFinite(timeSeconds)) {
      el.currentTime = Math.max(0, Math.min(timeSeconds, el.duration || 0));
    }
  }, []);

  const seekToPercent = useCallback(
    (percent: number) => {
      if (duration > 0) {
        const targetTime = (percent / 100) * duration;
        seek(targetTime);
      }
    },
    [duration, seek]
  );

  const skipForward = useCallback(
    (seconds = 10) => {
      seek(currentTime + seconds);
    },
    [currentTime, seek]
  );

  const skipBackward = useCallback(
    (seconds = 10) => {
      seek(currentTime - seconds);
    },
    [currentTime, seek]
  );

  // ---------------------------------------------------------------------------
  // Event handlers (to be attached to media element)
  // ---------------------------------------------------------------------------

  const handleLoadedMetadata = useCallback(() => {
    const el = mediaRef.current;
    if (el) {
      setDuration(el.duration || 0);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = mediaRef.current;
    if (el) {
      setCurrentTime(el.currentTime || 0);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const currentTimeFormatted = formatTime(currentTime);
  const durationFormatted = formatTime(duration);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    resolvedUrl,
    isVideo,
    isPlaying,
    currentTime,
    duration,
    currentTimeFormatted,
    durationFormatted,
    progress,
    setMediaRef,
    mediaRef,
    togglePlayPause,
    play,
    pause,
    seek,
    seekToPercent,
    skipForward,
    skipBackward,
    handleLoadedMetadata,
    handleTimeUpdate,
    handlePlay,
    handlePause,
    handleEnded,
  };
}
