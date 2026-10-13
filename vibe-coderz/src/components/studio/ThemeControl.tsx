"use client";

import { useSyncExternalStore } from "react";
import { Laptop, Moon, Sun } from "lucide-react";

type ThemeChoice = "system" | "light" | "dark";
const storageKey = "vibecoderzz-theme";
const choices: ThemeChoice[] = ["light", "system", "dark"];
const icons = { system: Laptop, light: Sun, dark: Moon };
const changeEvent = "vibecoderzz-theme-change";
const subscribe = (callback: () => void) => {
  window.addEventListener(changeEvent, callback);
  return () => window.removeEventListener(changeEvent, callback);
};
const snapshot = (): ThemeChoice => {
  const saved = document.documentElement.dataset.themeChoice;
  return saved === "light" || saved === "dark" ? saved : "system";
};

export function ThemeControl() {
  const choice = useSyncExternalStore<ThemeChoice>(subscribe, snapshot, () => "system");
  const choose = (next: ThemeChoice) => {
    document.documentElement.setAttribute("data-theme-choice", next);
    document.documentElement.setAttribute(
      "data-theme",
      next === "system"
        ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : next,
    );
    try {
      if (next === "system") localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, next);
    } catch {
      // The current page still honors the selection if storage is unavailable.
    }
    window.dispatchEvent(new Event(changeEvent));
  };

  return (
    <div
      className="theme-switch"
      data-choice={choice}
      role="radiogroup"
      aria-label="Appearance"
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const index = choices.indexOf(choice);
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? 2
          : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + 3) % 3;
        choose(choices[nextIndex]);
        event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[nextIndex]?.focus();
      }}
    >
      <span className="theme-switch-thumb" aria-hidden="true" />
      {choices.map((item) => {
        const Icon = icons[item];
        return (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={choice === item}
            aria-label={`${item[0].toUpperCase()}${item.slice(1)} theme`}
            title={item === "system" ? "Follow your system appearance (default)" : `${item} appearance`}
            tabIndex={choice === item ? 0 : -1}
            onClick={() => choose(item)}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
