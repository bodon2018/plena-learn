"use client";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/cn";

export default function TipFeedback({
  value,
  comment,
  onVote,
  onChangeComment,
  onSubmit,
}: {
  value?: "up" | "down";
  comment: string;
  onVote: (v: "up" | "down") => void;
  onChangeComment: (t: string) => void;
  onSubmit: () => void;
}) {
  const upSelected = value === "up";
  const downSelected = value === "down";

  return (
    <div className="rounded-xl border border-blue-200/60 bg-white/60 p-2">
      <div className="flex items-center gap-2">
        <button
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1 text-sm",
            upSelected ? "bg-green-100 text-green-700" : "hover:bg-neutral-100 text-neutral-700"
          )}
          onClick={() => onVote("up")}
        >
          <ThumbsUp className="h-4 w-4" /> Helpful
        </button>
        <button
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1 text-sm",
            downSelected ? "bg-red-100 text-red-700" : "hover:bg-neutral-100 text-neutral-700"
          )}
          onClick={() => onVote("down")}
        >
          <ThumbsDown className="h-4 w-4" /> Not helpful
        </button>
      </div>
      {downSelected && (
        <div className="mt-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
            <textarea
              className="h-16 w-full resize-none rounded-md border border-neutral-200 p-2 text-sm outline-none"
              placeholder="What made this tip not useful?"
              value={comment}
              onChange={(e) => onChangeComment(e.target.value)}
            />
            <div className="mt-2 text-right">
              <button
                className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                onClick={onSubmit}
                disabled={!comment?.trim()}
              >
                Submit feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
