import { redirect } from "next/navigation";

// Inicio is the landing page. Kept as a redirect (instead of deleting the
// route) so login/signup/the proxy's post-auth redirect, which all still
// point at "/dashboard", don't need to change.
export default function DashboardPage() {
  redirect("/dashboard/inicio");
}
