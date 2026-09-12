"use client";

import { useSyncExternalStore } from "react";

export const motionEvent = "studio-motion-change";
export function motionSnapshot() {
  try {
    return (
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      localStorage.getItem("studio-motion") !== "off"
    );
  } catch {
    return !matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
}
export function subscribeMotion(callback: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  window.addEventListener(motionEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    query.removeEventListener("change", callback);
    window.removeEventListener(motionEvent, callback);
    window.removeEventListener("storage", callback);
  };
}
export function useStudioMotion() {
  return useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
}

