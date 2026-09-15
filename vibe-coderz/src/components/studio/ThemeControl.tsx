"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Laptop, Moon, Sun } from "lucide-react";

type ThemeChoice = "system" | "light" | "dark";
const storageKey = "vibecoderzz-theme";
const choices: ThemeChoice[] = ["system", "light", "dark"];
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
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>(".is-selected")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
    setOpen(false);
    trigger.current?.focus();
  };

  const Icon = icons[choice];
  return (
    <div className="theme-control" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="theme-trigger"
        aria-label={`Appearance: ${choice}. Choose theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="theme-menu"
        onClick={() => setOpen(!open)}
      >
        <Icon size={19} aria-hidden="true" />
        <span>{choice}</span>
      </button>
      {open && (
        <div
          className="theme-menu"
          id="theme-menu"
          role="menu"
          aria-label="Appearance"
          ref={menu}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
            const current = items.indexOf(document.activeElement as HTMLButtonElement);
            const target = event.key === "Home" ? 0
              : event.key === "End" ? items.length - 1
              : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
            items[target]?.focus();
          }}
        >
          {choices.map((item) => {
            const ItemIcon = icons[item];
            return (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={choice === item}
                className={choice === item ? "is-selected" : undefined}
                onClick={() => choose(item)}
              >
                <ItemIcon size={17} aria-hidden="true" />
                <span>{item}</span>
                <span className="theme-choice-mark" aria-hidden="true">{choice === item ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
