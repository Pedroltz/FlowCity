import { Routes } from "@angular/router";
export const routes: Routes = [
  {
    path: "dashboard",
    title: "Dashboard · LinkPlan",
    loadComponent: () =>
      import("./pages/dashboard").then((m) => m.DashboardPage),
  },
  {
    path: "redes",
    title: "Minhas redes · LinkPlan",
    loadComponent: () => import("./pages/networks").then((m) => m.NetworksPage),
  },
  {
    path: "editor",
    title: "Editar rede · LinkPlan",
    loadComponent: () => import("./pages/editor").then((m) => m.EditorPage),
  },
  {
    path: "simulacoes",
    title: "Planejamento · LinkPlan",
    loadComponent: () =>
      import("./pages/simulations").then((m) => m.SimulationsPage),
  },
  {
    path: "resultados",
    title: "Resultados · LinkPlan",
    loadComponent: () => import("./pages/results").then((m) => m.ResultsPage),
  },
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  { path: "**", redirectTo: "dashboard" },
];
