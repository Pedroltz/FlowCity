import { DOCUMENT } from "@angular/common";
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
export type ThemePreference = "system" | "light" | "dark";
export const THEME_KEY = "linkplan-theme";
@Injectable({ providedIn: "root" })
export class ThemeService {
  private document = inject(DOCUMENT);
  private window = this.document.defaultView;
  private media = this.window?.matchMedia("(prefers-color-scheme: dark)");
  preference = signal<ThemePreference>("system");
  dark = signal(this.document.documentElement.dataset["theme"] === "dark");
  constructor() {
    let saved: string | null = null;
    try {
      saved = this.window?.localStorage.getItem(THEME_KEY) ?? null;
    } catch {
      /* Storage may be blocked; the current session still works. */
    }
    this.preference.set(
      saved === "dark" || saved === "light" ? saved : "system",
    );
    this.apply();
    const change = () => this.apply();
    this.media?.addEventListener("change", change);
    inject(DestroyRef).onDestroy(() =>
      this.media?.removeEventListener("change", change),
    );
  }
  setPreference(value: string) {
    if (value !== "system" && value !== "light" && value !== "dark") return;
    this.preference.set(value);
    try {
      this.window?.localStorage.setItem(THEME_KEY, value);
    } catch {
      /* Preserve the in-memory preference when storage is unavailable. */
    }
    this.apply();
  }
  private apply() {
    const dark =
      this.preference() === "dark" ||
      (this.preference() === "system" && !!this.media?.matches);
    this.document.documentElement.dataset["theme"] = dark ? "dark" : "light";
    this.dark.set(dark);
  }
}
