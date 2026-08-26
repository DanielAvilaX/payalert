import Image from "next/image";

export function LoadingDots({ full = false }: { full?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 ${full ? "min-h-[65vh]" : "py-10"}`}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="loading-glow absolute inset-0 rounded-full bg-accent blur-2xl" />
        <Image src="/logo.png" alt="" width={56} height={56} className="relative rounded-2xl" />
      </div>
      <div className="flex items-center gap-3">
        <span className="loading-dot h-4 w-4 rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
        <span
          className="loading-dot h-4 w-4 rounded-full bg-sky-400"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="loading-dot h-4 w-4 rounded-full bg-violet-500"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <p className="text-sm text-muted">Cargando...</p>
    </div>
  );
}
