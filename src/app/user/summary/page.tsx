"use client";

import { useSearchParams } from "next/navigation";
import SummaryScreen from "@/features/summary/SummaryScreen";

/**
 * Learn page (routed as /user/summary).
 * Reads mediaId/mediaUrl from the query string so we can
 * review the recording that was just finished.
 */
export default function SummaryPage() {
  const searchParams = useSearchParams();
  const mediaId = searchParams.get("mediaId");
  const mediaUrl = searchParams.get("mediaUrl");

  return <SummaryScreen mediaId={mediaId} mediaUrl={mediaUrl} />;
}
