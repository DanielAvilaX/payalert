import { Spinner } from "@/app/dashboard/spinner";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted">
      <Spinner size={28} />
    </div>
  );
}
