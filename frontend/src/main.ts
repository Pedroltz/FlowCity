import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient } from "@angular/common/http";
import { LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import pt from "@angular/common/locales/pt";
import { AppComponent } from "./app/app.component";
import {
  NavigationError,
  provideRouter,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from "@angular/router";
import { routes } from "./app/app.routes";

const staleChunkReloadKey = "linkplan:stale-chunk-reload";

function recoverFromStaleChunk(error: NavigationError): void {
  const message = String(error.error).toLowerCase();
  const isChunkLoadError =
    message.includes("dynamically imported module") ||
    message.includes("importing a module script failed");

  if (!isChunkLoadError || typeof window === "undefined") return;

  try {
    if (window.sessionStorage.getItem(staleChunkReloadKey)) return;
    window.sessionStorage.setItem(staleChunkReloadKey, "1");
  } catch {
    // If storage is unavailable, a single reload still lets the router fetch the latest app.
  }

  window.location.reload();
}

registerLocaleData(pt);
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: "enabled",
        anchorScrolling: "enabled",
      }),
      withNavigationErrorHandler(recoverFromStaleChunk),
    ),
    { provide: LOCALE_ID, useValue: "pt-BR" },
  ],
}).catch(console.error);
