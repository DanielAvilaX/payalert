"use client";

import { useState } from "react";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function Greeting({ name }: { name: string }) {
  // The server doesn't know the viewer's local hour, so this only settles
  // to the right greeting once React hydrates on the client - the mismatch
  // warning is expected and harmless here, so it's suppressed.
  const [greeting] = useState(() => greetingForHour(new Date().getHours()));

  return (
    <h1 className="text-2xl font-semibold" suppressHydrationWarning>
      {greeting}
      {name ? `, ${name}` : ""}
    </h1>
  );
}
