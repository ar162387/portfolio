"use client";

import { usePathname } from "next/navigation";
import { isNicheKey } from "@/lib/niche-demos";
import { VoiceAssistant } from "./VoiceAssistant";

export function VoiceAssistantMount() {
  const pathname = usePathname();
  // Demo pages supply their own voice interface.
  const route = pathname.replace(/^\//, "").replace(/\/$/, "");
  return route === "demo" || isNicheKey(route) ? null : <VoiceAssistant />;
}
