

// CHANGE: New root page that simply redirects "/" to the user app.
// Pick the landing you prefer (progress, session, etc.)

import { redirect } from "next/navigation";

export default function RootRedirect() {
  redirect("/user/session"); // CHANGE: was "/progress" when using route groups
  return null;
}
