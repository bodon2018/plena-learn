"use client";

import { useSearchParams } from "next/navigation";
import LearnScreen from "@/features/learn/LearnScreen";

/**
 * Learn page (routed as /user/learn).
 * Reads mediaId/mediaUrl from the query string so we can
 * review the recording that was just finished.
 */
export default function LearnPage() {
  const searchParams = useSearchParams();
  const mediaId = searchParams.get("mediaId");
  const mediaUrl = searchParams.get("mediaUrl");

  return <LearnScreen mediaId={mediaId} mediaUrl={mediaUrl} />;
}
