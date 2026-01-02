import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

// =============================================================================
// MOCK MODE - Set to true to test UI without backend
// =============================================================================
const MOCK_MODE = true;

/**
 * AI readiness states:
 * - "idle": No media loaded
 * - "processing": Media is being analyzed (transcription, etc.)
 * - "ready": AI is ready to answer questions
 * - "error": Something went wrong during processing
 */
export type AIReadinessState = "idle" | "processing" | "ready" | "error";

/**
 * An AI reply attached to an annotation.
 */
export type AIReply = {
  annotationId: number;
  question: string;
  answer: string;
  createdAt: string;
};

/**
 * Pending query state for an annotation.
 */
type PendingQuery = {
  annotationId: number;
  question: string;
};

type UseAIAssistantOptions = {
  /** Media ID to check AI readiness for */
  mediaId: string | null;
};

type UseAIAssistantReturn = {
  /** Current AI readiness state */
  readiness: AIReadinessState;
  /** Error message if readiness is "error" */
  readinessError: string | null;
  /** Map of annotation ID to AI replies */
  replies: Map<number, AIReply[]>;
  /** Set of annotation IDs currently loading */
  loadingAnnotations: Set<number>;
  /** Check if AI is ready to answer questions */
  isReady: boolean;
  /** Check if AI is still processing media */
  isProcessing: boolean;
  /** Ask AI a question about a specific annotation */
  askAI: (annotationId: number, question: string) => Promise<void>;
  /** Refresh readiness status */
  refreshReadiness: () => void;
};

// =============================================================================
// MOCK RESPONSES - Rotate through these for testing
// =============================================================================
const MOCK_RESPONSES = [
  "Focus on keeping your elbow higher during the follow-through. This will help with accuracy and power.",
  "Good timing on this play. Try to anticipate the movement a half-second earlier for even better positioning.",
  "Your footwork looks solid here. Consider widening your stance slightly for better balance.",
];

/**
 * Hook for managing AI assistant state and interactions.
 *
 * Handles:
 * - Polling for AI readiness (media processing status)
 * - Sending questions to AI about specific annotations
 * - Managing AI replies per annotation
 *
 * @example
 * const { readiness, isReady, askAI, replies } = useAIAssistant({ mediaId });
 */
export function useAIAssistant({
  mediaId,
}: UseAIAssistantOptions): UseAIAssistantReturn {
  // ---------------------------------------------------------------------------
  // MOCK MODE IMPLEMENTATION
  // ---------------------------------------------------------------------------

  const [mockReplies, setMockReplies] = useState<Map<number, AIReply[]>>(
    new Map()
  );
  const [mockLoading, setMockLoading] = useState<Set<number>>(new Set());
  const mockResponseIndex = useRef(0);

  const mockAskAI = useCallback(
    async (annotationId: number, question: string) => {
      // Add to loading set
      setMockLoading((prev) => new Set(prev).add(annotationId));

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Get mock response
      const answer = MOCK_RESPONSES[mockResponseIndex.current % MOCK_RESPONSES.length];
      mockResponseIndex.current += 1;

      const newReply: AIReply = {
        annotationId,
        question,
        answer,
        createdAt: new Date().toISOString(),
      };

      // Add reply
      setMockReplies((prev) => {
        const next = new Map(prev);
        const existing = next.get(annotationId) ?? [];
        next.set(annotationId, [...existing, newReply]);
        return next;
      });

      // Remove from loading
      setMockLoading((prev) => {
        const next = new Set(prev);
        next.delete(annotationId);
        return next;
      });
    },
    []
  );

  // Return mock implementation if MOCK_MODE is enabled
  if (MOCK_MODE) {
    return {
      readiness: mediaId ? "ready" : "idle",
      readinessError: null,
      replies: mockReplies,
      loadingAnnotations: mockLoading,
      isReady: !!mediaId,
      isProcessing: false,
      askAI: mockAskAI,
      refreshReadiness: () => {},
    };
  }

  // ---------------------------------------------------------------------------
  // REAL IMPLEMENTATION (when MOCK_MODE = false)
  // ---------------------------------------------------------------------------

  const [readiness, setReadiness] = useState<AIReadinessState>("idle");
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [replies, setReplies] = useState<Map<number, AIReply[]>>(new Map());
  const [loadingAnnotations, setLoadingAnnotations] = useState<Set<number>>(
    new Set()
  );

  // Ref to track if component is mounted (avoid state updates after unmount)
  const mountedRef = useRef(true);

  // Polling interval ref
  const pollingRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Readiness polling
  // ---------------------------------------------------------------------------

  const checkReadiness = useCallback(async () => {
    if (!mediaId) {
      setReadiness("idle");
      setReadinessError(null);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/media/${encodeURIComponent(mediaId)}/ai-status`
      );

      if (!res.ok) {
        // If endpoint doesn't exist yet, assume processing
        if (res.status === 404) {
          setReadiness("processing");
          return;
        }
        throw new Error(`Status check failed: ${res.status}`);
      }

      const data = await res.json();

      if (!mountedRef.current) return;

      // Expected response: { status: "processing" | "ready" | "error", error?: string }
      if (data.status === "ready") {
        setReadiness("ready");
        setReadinessError(null);
        // Stop polling once ready
        if (pollingRef.current) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } else if (data.status === "error") {
        setReadiness("error");
        setReadinessError(data.error ?? "Failed to process media");
        // Stop polling on error
        if (pollingRef.current) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } else {
        setReadiness("processing");
      }
    } catch (err) {
      console.error("Error checking AI readiness:", err);
      if (!mountedRef.current) return;
      // Don't set error state for network issues, just keep polling
    }
  }, [mediaId]);

  const refreshReadiness = useCallback(() => {
    void checkReadiness();
  }, [checkReadiness]);

  // Start polling when mediaId changes
  useEffect(() => {
    mountedRef.current = true;

    // Clear existing replies when media changes
    setReplies(new Map());
    setLoadingAnnotations(new Set());

    if (!mediaId) {
      setReadiness("idle");
      setReadinessError(null);
      return;
    }

    // Initial check
    setReadiness("processing");
    void checkReadiness();

    // Poll every 3 seconds while processing
    pollingRef.current = window.setInterval(() => {
      void checkReadiness();
    }, 3000);

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [mediaId, checkReadiness]);

  // ---------------------------------------------------------------------------
  // Ask AI
  // ---------------------------------------------------------------------------

  const askAI = useCallback(
    async (annotationId: number, question: string) => {
      if (!mediaId || readiness !== "ready") {
        console.warn("AI not ready or no media loaded");
        return;
      }

      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) return;

      // Mark annotation as loading
      setLoadingAnnotations((prev) => new Set(prev).add(annotationId));

      try {
        const res = await fetch(
          `${API_BASE}/api/media/${encodeURIComponent(mediaId)}/ai-ask`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              annotation_id: annotationId,
              question: trimmedQuestion,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(`AI request failed: ${res.status}`);
        }

        const data = await res.json();

        if (!mountedRef.current) return;

        // Expected response: { answer: string }
        const newReply: AIReply = {
          annotationId,
          question: trimmedQuestion,
          answer: data.answer ?? "I couldn't generate a response.",
          createdAt: new Date().toISOString(),
        };

        // Add reply to the map
        setReplies((prev) => {
          const next = new Map(prev);
          const existing = next.get(annotationId) ?? [];
          next.set(annotationId, [...existing, newReply]);
          return next;
        });
      } catch (err) {
        console.error("Error asking AI:", err);

        if (!mountedRef.current) return;

        // Add error reply
        const errorReply: AIReply = {
          annotationId,
          question: trimmedQuestion,
          answer: "Sorry, I couldn't process your question. Please try again.",
          createdAt: new Date().toISOString(),
        };

        setReplies((prev) => {
          const next = new Map(prev);
          const existing = next.get(annotationId) ?? [];
          next.set(annotationId, [...existing, errorReply]);
          return next;
        });
      } finally {
        if (mountedRef.current) {
          setLoadingAnnotations((prev) => {
            const next = new Set(prev);
            next.delete(annotationId);
            return next;
          });
        }
      }
    },
    [mediaId, readiness]
  );

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const isReady = readiness === "ready";
  const isProcessing = readiness === "processing";

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    readiness,
    readinessError,
    replies,
    loadingAnnotations,
    isReady,
    isProcessing,
    askAI,
    refreshReadiness,
  };
}