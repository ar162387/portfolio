"use client";

import { usePathname } from "next/navigation";
import { isNicheKey } from "@/lib/niche-demos";
import { VoiceAssistant } from "./VoiceAssistant";

export function VoiceAssistantMount() {
  const pathname = usePathname();
  // The niche page mounts the same component inline with an isolated session.
  return isNicheKey(pathname.replace(/^\//, "").replace(/\/$/, "")) ? null : <VoiceAssistant />;
}
