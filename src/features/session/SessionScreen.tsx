"use client";

import { cn } from "@/lib/cn";
import { AlertCircle, X } from "lucide-react";
import Card from "@/components/ui/Card";
import { useRecording } from "./hooks/useRecording";
import RecordingVisualizer from "./components/RecordingVisualizer";
import ContextSelector from "./components/ContextSelector";
import ModeSelector from "./components/ModeSelector";
import VideoPreview from "./components/VideoPreview";
import RecordingControls from "./components/RecordingControls";

type Props = {
  /** Optional callback when user finishes recording */
  onFinish?: () => void;
};

/**
 * Session screen - Record practices and games.
 * 
 * Features:
 * - Beautiful Siri-like visualizer while recording
 * - Custom-styled context selector (Practice/Game)
 * - Audio/Video mode toggle
 * - Live video preview
 * - Polished recording controls
 */
export default function SessionScreen({ onFinish }: Props) {
  const recording = useRecording({ onFinish });

  return (
    <div className="space-y-6 pb-4">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Session</h1>
        <p className="text-body text-mute mt-1">
          Record your practice or game to review later.
        </p>
      </div>

      {/* Error banner */}
      {recording.error && (
        <div
          className={cn(
            "flex items-start gap-3 p-4",
            "rounded-2xl",
            "bg-danger/5 border border-danger/20",
            "animate-fade-up"
          )}
        >
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-danger font-medium">
              Recording Error
            </p>
            <p className="text-caption text-danger/80 mt-0.5">
              {recording.error}
            </p>
          </div>
          <button
            type="button"
            onClick={recording.clearError}
            className="text-danger/60 hover:text-danger transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Recording visualizer / Video preview */}
      <Card padded={false} className="overflow-hidden">
        {recording.mode === "video" ? (
          <VideoPreview
            videoRef={recording.videoRef}
            isRecording={recording.isRecording}
            duration={recording.durationFormatted}
          />
        ) : (
          <RecordingVisualizer
            isRecording={recording.isRecording}
            duration={recording.durationFormatted}
            mode={recording.mode}
          />
        )}
      </Card>

      {/* Settings section */}
      <Card>
        <div className="space-y-6">
          {/* Context selector */}
          <div>
            <h2 className="text-heading-3 text-ink mb-1">
              Session Type
            </h2>
            <p className="text-body-sm text-mute mb-4">
              What kind of session is this?
            </p>
            <ContextSelector
              value={recording.sessionContext}
              onChange={recording.setSessionContext}
              disabled={recording.isRecording}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100" />

          {/* Mode selector */}
          <div>
            <h2 className="text-heading-3 text-ink mb-1">
              Recording Mode
            </h2>
            <p className="text-body-sm text-mute mb-4">
              Choose how you want to capture this session.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <ModeSelector
                value={recording.mode}
                onChange={recording.setMode}
                disabled={recording.isRecording}
              />
              <span className="text-caption text-subtle">
                {recording.mode === "video"
                  ? "Camera and microphone will be used"
                  : "Only microphone will be used"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Recording controls - sticky bottom */}
      <RecordingControls
        isRecording={recording.isRecording}
        isStarting={recording.isStarting}
        duration={recording.durationFormatted}
        onToggle={recording.toggleRecording}
        onFinish={recording.handleFinish}
      />
    </div>
  );
}