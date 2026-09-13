import { redirect } from "next/navigation";

// Straight to the landing page rather than bouncing through /dashboard,
// which would only redirect here anyway - one round trip instead of two.
// (/dashboard still exists and still forwards, since login, signup and the
// proxy all point at it.)
export default function Home() {
  redirect("/dashboard/inicio");
}
