"use client";
import { useRef, useEffect } from "react";
import { Pause, Play } from "lucide-react";

export default function AudioPlayButton({
  src,
  playing,
  onPlay,
  onPause,
  label = "20s",
}: {
  src: string;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  label?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => onPause();
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, [onPause]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.play().catch(() => onPause());
    else a.pause();
  }, [playing, onPause]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => (playing ? onPause() : onPlay())}
        className="grid h-10 w-10 place-items-center rounded-xl border"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <span className="text-sm text-neutral-600">{label}</span>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
