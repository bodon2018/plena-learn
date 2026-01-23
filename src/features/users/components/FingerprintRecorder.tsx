"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { Mic, Square, Check, X, Loader2 } from "lucide-react";
import { useFingerprintRecorder } from "../hooks/useFingerprintRecorder";

type FingerprintRecorderProps = {
  /** User ID to record fingerprint for */
  userId: string;
  /** User's display name */
  userName: string;
  /** Whether user already has a fingerprint */
  hasFingerprint: boolean;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Callback when recording is complete and ready to upload */
  onUpload: (userId: string, audioBlob: Blob) => void;
  /** Callback to close the recorder */
  onClose: () => void;
};

/**
 * Fingerprint recorder component with audio visualizer.
 * Records voice sample and provides upload callback.
 */
export default function FingerprintRecorder({
  userId,
  userName,
  hasFingerprint,
  isUploading,
  onUpload,
  onClose,
}: FingerprintRecorderProps) {
  const recorder = useFingerprintRecorder();

  // Auto-cleanup on close
  useEffect(() => {
    return () => {
      recorder.reset();
    };
  }, []);

  const handleUpload = () => {
    if (recorder.recordedBlob) {
      onUpload(userId, recorder.recordedBlob);
    }
  };

  const handleRetry = () => {
    recorder.reset();
  };

  // Minimum recording duration (5 seconds)
  const MIN_DURATION = 5;
  const canStop = recorder.durationSec >= MIN_DURATION;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        "flex items-center justify-center",
        "bg-black/50 backdrop-blur-sm",
        "animate-fade-up"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !recorder.isRecording && !isUploading) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "w-full max-w-md mx-4",
          "bg-white rounded-3xl",
          "shadow-elevated",
          "overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-heading-3 text-ink">
                {hasFingerprint ? "Re-record" : "Record"} Voice Fingerprint
              </h2>
              <p className="text-body-sm text-mute mt-1">
                Recording for <span className="font-medium text-ink">{userName}</span>
              </p>
            </div>
            {!recorder.isRecording && !isUploading && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "w-8 h-8 rounded-full",
                  "flex items-center justify-center",
                  "text-mute hover:text-ink",
                  "hover:bg-neutral-100",
                  "transition-colors"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {/* Visualizer */}
          <div
            className={cn(
              "relative h-32 rounded-2xl mb-6",
              "bg-gradient-to-br from-primary/5 to-sky/5",
              "flex items-center justify-center",
              "overflow-hidden"
            )}
          >
            {recorder.isRecording ? (
              // Recording visualization
              <div className="flex items-center gap-1">
                {Array.from({ length: 20 }).map((_, i) => {
                  // Create wave effect based on audio level
                  const baseHeight = 8;
                  const maxHeight = 48;
                  const waveOffset = Math.sin((i / 20) * Math.PI * 2 + Date.now() / 200) * 0.3;
                  const height = baseHeight + (maxHeight - baseHeight) * (recorder.audioLevel + waveOffset) * (1 - Math.abs(i - 10) / 15);
                  
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-primary transition-all duration-75"
                      style={{ height: `${Math.max(baseHeight, height)}px` }}
                    />
                  );
                })}
              </div>
            ) : recorder.recordedBlob ? (
              // Recording complete
              <div className="text-center">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full mx-auto mb-3",
                    "bg-success/10",
                    "flex items-center justify-center"
                  )}
                >
                  <Check className="w-8 h-8 text-success" />
                </div>
                <p className="text-body-sm font-medium text-ink">Recording Complete</p>
                <p className="text-caption text-mute mt-1">
                  Duration: {recorder.durationFormatted}
                </p>
              </div>
            ) : (
              // Ready to record
              <div className="text-center">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full mx-auto mb-3",
                    "bg-neutral-100",
                    "flex items-center justify-center"
                  )}
                >
                  <Mic className="w-8 h-8 text-mute" />
                </div>
                <p className="text-body-sm text-mute">
                  Tap the button below to start recording
                </p>
              </div>
            )}
          </div>

          {/* Duration display during recording */}
          {recorder.isRecording && (
            <div className="text-center mb-6">
              <p className="text-heading-2 text-ink tabular-nums">
                {recorder.durationFormatted}
              </p>
              <p className="text-caption text-mute mt-1">
                {canStop
                  ? "Tap stop when finished speaking"
                  : `Keep speaking for ${MIN_DURATION - recorder.durationSec} more seconds...`}
              </p>
            </div>
          )}

          {/* Error */}
          {recorder.error && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl mb-6",
                "bg-danger/5 border border-danger/20"
              )}
            >
              <X className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-danger">{recorder.error}</p>
            </div>
          )}

          {/* Instructions */}
          {!recorder.isRecording && !recorder.recordedBlob && (
            <div
              className={cn(
                "p-4 rounded-xl mb-6",
                "bg-secondary/5 border border-secondary/20"
              )}
            >
              <p className="text-body-sm text-secondary font-medium mb-2">
                Recording Tips
              </p>
              <ul className="text-caption text-mute space-y-1">
                <li>• Speak naturally for at least 10-15 seconds</li>
                <li>• Introduce yourself or count numbers</li>
                <li>• Find a quiet environment</li>
                <li>• Keep consistent distance from mic</li>
              </ul>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {recorder.isRecording ? (
              // Stop button
              <button
                type="button"
                onClick={recorder.stopRecording}
                disabled={!canStop}
                className={cn(
                  "w-16 h-16 rounded-full",
                  "flex items-center justify-center",
                  "bg-danger text-white",
                  "ring-4 ring-danger/20",
                  "shadow-lift",
                  "transition-all duration-200",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Square className="w-6 h-6 fill-white" />
              </button>
            ) : recorder.recordedBlob ? (
              // Upload / Retry buttons
              <>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isUploading}
                  className={cn(
                    "px-5 py-2.5 rounded-full",
                    "border border-neutral-200",
                    "text-ui font-medium text-mute",
                    "hover:bg-neutral-50 hover:text-ink",
                    "transition-all duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Re-record
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className={cn(
                    "inline-flex items-center gap-2",
                    "px-6 py-2.5 rounded-full",
                    "bg-primary text-white",
                    "text-ui font-semibold",
                    "shadow-soft hover:shadow-lift",
                    "transition-all duration-150",
                    "active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Fingerprint
                    </>
                  )}
                </button>
              </>
            ) : (
              // Start button
              <button
                type="button"
                onClick={recorder.startRecording}
                disabled={recorder.isInitializing}
                className={cn(
                  "w-16 h-16 rounded-full",
                  "flex items-center justify-center",
                  "bg-primary text-white",
                  "ring-4 ring-primary/20",
                  "shadow-lift",
                  "transition-all duration-200",
                  "active:scale-95",
                  "disabled:opacity-50"
                )}
              >
                {recorder.isInitializing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}