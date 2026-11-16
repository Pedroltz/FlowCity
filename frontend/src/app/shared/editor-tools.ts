import {
  Component,
  effect,
  inject,
  signal,
  afterNextRender,
  Injector,
  ElementRef,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { WorkspaceState } from "../workspace-state.service";
@Component({
  selector: "fc-editor-tools",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./editor-tools.html",
})
export class EditorTools {
  readonly s = inject(WorkspaceState);
  private injector = inject(Injector);
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  tool = signal<"point" | "connection" | "edit">("point");
  search = signal("");
  draftCapacity: number | null = null;
  bothDirections = false;
  constructor() {
    effect(() => {
      if (this.s.selectedNode() || this.s.selectedEdge()) {
        this.tool.set("edit");
        afterNextRender(
          () => {
            if (
              this.host.nativeElement.ownerDocument.defaultView?.matchMedia(
                "(max-width: 900px)",
              ).matches
            ) {
              const panel =
                this.host.nativeElement.querySelector<HTMLElement>(
                  ".selection-editor",
                );
              panel?.scrollIntoView({ block: "nearest" });
              panel
                ?.querySelector<HTMLInputElement>("input")
                ?.focus({ preventScroll: true });
            }
          },
          { injector: this.injector },
        );
      }
    });
  }
  pointName(id: string) {
    return this.s.graph().nodes.find((n) => n.id === id)?.name ?? id;
  }
  points() {
    const q = this.search().toLocaleLowerCase();
    return this.s
      .graph()
      .nodes.filter((n) =>
        (n.name + " " + n.id).toLocaleLowerCase().includes(q),
      );
  }
  connections() {
    const q = this.search().toLocaleLowerCase();
    return this.s
      .graph()
      .edges.filter((e) =>
        (this.pointName(e.source) + " " + this.pointName(e.target) + " " + e.id)
          .toLocaleLowerCase()
          .includes(q),
      );
  }
  addPoint() {
    if (this.s.busy()) return;
    if (!this.s.nodeId.trim()) {
      let index = 1;
      while (this.s.graph().nodes.some((n) => n.id === "P" + index)) index++;
      this.s.nodeId = "P" + index;
    }
    const count = this.s.graph().nodes.length,
      name = this.s.nodeName.trim();
    this.s.addNode();
    if (this.s.graph().nodes.length === count) return;
    const nodes = this.s.graph().nodes;
    if (!this.s.source) this.s.source = nodes[0].id;
    if (nodes.length > 1 && !this.s.sink) this.s.sink = nodes[1].id;
    if (!this.s.edgeSource) this.s.edgeSource = nodes[0].id;
    if (
      nodes.length > 1 &&
      (!this.s.edgeTarget || this.s.edgeTarget === this.s.edgeSource)
    )
      this.s.edgeTarget = nodes[1].id;
    this.s.draw(true);
    this.s.message.set(
      `Ponto “${name}” adicionado. Você pode adicionar outro ponto ou criar uma conexão.`,
    );
  }
  apply() {
    this.s.applySelection();
    if (!this.s.error())
      this.s.message.set(
        "Alteração aplicada ao rascunho. Salve a rede para guardar.",
      );
  }
  validDraft() {
    return (
      this.draftCapacity !== null && this.s.validCapacity(this.draftCapacity)
    );
  }
  addConnection() {
    if (this.s.busy()) return;
    if (!this.validDraft()) {
      this.s.error.set("Informe uma capacidade inteira entre 0 e 2147483647.");
      return;
    }
    const count = this.s.graph().edges.length;
    this.s.capacity = this.draftCapacity!;
    this.s.addEdge();
    if (this.s.graph().edges.length === count) return;
    if (this.bothDirections && this.s.edgeSource !== this.s.edgeTarget) {
      const source = this.s.edgeSource,
        target = this.s.edgeTarget;
      this.s.edgeSource = target;
      this.s.edgeTarget = source;
      this.s.addEdge();
      this.s.edgeSource = source;
      this.s.edgeTarget = target;
    }
    this.draftCapacity = null;
    this.s.message.set(
      this.bothDirections && this.s.edgeSource !== this.s.edgeTarget
        ? "Conexões de ida e volta criadas com a mesma capacidade."
        : "Conexão criada. A seta indica o sentido permitido.",
    );
    this.s.draw(true);
  }
}
