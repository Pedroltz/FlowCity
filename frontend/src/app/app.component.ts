import { ThemeService } from "./theme.service";
import {
  Component,
  inject,
  OnInit,
  HostListener,
  signal,
  afterNextRender,
  Injector,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs";
import {
  Router,
  NavigationEnd,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import {
  LucideLayoutDashboard,
  LucideNetwork,
  LucidePencilRuler,
  LucidePlay,
  LucideChartNoAxesCombined,
  LucideMenu,
  LucideGraduationCap,
} from "@lucide/angular";
import { WorkspaceState } from "./workspace-state.service";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideLayoutDashboard,
    LucideNetwork,
    LucidePencilRuler,
    LucidePlay,
    LucideChartNoAxesCombined,
    LucideMenu,
    LucideGraduationCap,
  ],
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
  readonly theme = inject(ThemeService);
  readonly s = inject(WorkspaceState);
  menuOpen = signal(false);
  private document = inject(DOCUMENT);
  private injector = inject(Injector);
  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        try {
          this.document.defaultView?.sessionStorage.removeItem(
            "linkplan:stale-chunk-reload",
          );
        } catch {
          // Storage can be unavailable in private browsing contexts.
        }
        this.menuOpen.set(false);
        afterNextRender(
          () =>
            this.document
              .getElementById("main-content")
              ?.focus({ preventScroll: true }),
          { injector: this.injector },
        );
      });
  }
  ngOnInit() {
    this.reload();
  }
  reload() {
    void this.s.run(async () => {
      await this.s.refresh();
      if (!this.s.graph().id && !this.s.dirty() && this.s.networks().length)
        await this.s.load(this.s.networks()[0].id);
    });
  }
  @HostListener("window:beforeunload", ["$event"]) beforeUnload(
    event: BeforeUnloadEvent,
  ) {
    if (this.s.dirty()) event.preventDefault();
  }
  @HostListener("document:keydown.escape") closeMenu() {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
    }
  }
}
