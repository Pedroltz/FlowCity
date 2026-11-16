import { Routes } from "@angular/router";
export const routes: Routes = [
  {
    path: "dashboard",
    title: "Dashboard · FlowCity",
    loadComponent: () =>
      import("./pages/dashboard").then((m) => m.DashboardPage),
  },
  {
    path: "redes",
    title: "Minhas redes · FlowCity",
    loadComponent: () => import("./pages/networks").then((m) => m.NetworksPage),
  },
  {
    path: "editor",
    title: "Editor · FlowCity",
    loadComponent: () => import("./pages/editor").then((m) => m.EditorPage),
  },
  {
    path: "simulacoes",
    title: "Simulações · FlowCity",
    loadComponent: () =>
      import("./pages/simulations").then((m) => m.SimulationsPage),
  },
  {
    path: "resultados",
    title: "Resultados · FlowCity",
    loadComponent: () => import("./pages/results").then((m) => m.ResultsPage),
  },
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  { path: "**", redirectTo: "dashboard" },
];
