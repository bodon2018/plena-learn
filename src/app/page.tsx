// CHANGE: Redirect root (/) to /account so users land on the Account page by default.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/account"); // CHANGE
}

