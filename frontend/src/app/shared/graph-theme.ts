import { Core } from "cytoscape";
// Update paint only: preserve positions, selection, zoom and computed results.
export function applyGraphTheme(cy: Core | undefined, dark: boolean) {
  if (!cy) return;
  cy.style()
    .selector("node")
    .style({ color: dark ? "#e6e4f1" : "#302b49" })
    .selector("edge")
    .style({
      color: dark ? "#e6e4f1" : "#302b49",
      "text-background-color": dark ? "#27272a" : "#ffffff",
    })
    .selector(".used")
    .style({
      "line-color": dark ? "#ad9aff" : "#6550bf",
      "target-arrow-color": dark ? "#ad9aff" : "#6550bf",
    })
    .selector(".reverse")
    .style({
      "line-color": dark ? "#edbd75" : "#b87828",
      "target-arrow-color": dark ? "#edbd75" : "#b87828",
    })
    .selector(".cut")
    .style({
      "line-color": dark ? "#82bdff" : "#326da9",
      "target-arrow-color": dark ? "#82bdff" : "#326da9",
    })
    .selector(".failed")
    .style({
      "line-color": dark ? "#ff8295" : "#b73348",
      "target-arrow-color": dark ? "#ff8295" : "#b73348",
    })
    .selector(".path-highlight, .highlight")
    .style({
      "line-color": dark ? "#ffd080" : "#bc7419",
      "target-arrow-color": dark ? "#ffd080" : "#bc7419",
    })
    .selector(":selected")
    .style({
      "border-color": dark ? "#ffd080" : "#e0a53a",
      "line-color": dark ? "#ffd080" : "#e0a53a",
      "target-arrow-color": dark ? "#ffd080" : "#e0a53a",
    })
    .update();
}
