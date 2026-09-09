using FlowCity.Domain;
namespace FlowCity.Application;

public static class GraphValidator
{
    public static void Validate(Graph graph)
    {
        if (string.IsNullOrWhiteSpace(graph.Name) || graph.Name.Length > 200)
            throw new ArgumentException("Informe um nome de rede com até 200 caracteres.");
        if (graph.Description is null || graph.Description.Length > 5000)
            throw new ArgumentException("A descrição deve ter até 5000 caracteres.");
        if (graph.Nodes is null || graph.Edges is null || graph.Nodes.Count > 500 || graph.Edges.Count > 5000)
            throw new ArgumentException("Informe listas com até 500 vértices e 5000 arestas.");
        var nodes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var node in graph.Nodes)
            if (node is null || string.IsNullOrWhiteSpace(node.Id) || node.Id.Length > 100 ||
                !nodes.Add(node.Id) || string.IsNullOrWhiteSpace(node.Name) || node.Name.Length > 200 ||
                !double.IsFinite(node.X) || !double.IsFinite(node.Y))
                throw new ArgumentException("Vértices devem ter IDs únicos, nomes e coordenadas válidas.");
        var edges = new HashSet<string>(StringComparer.Ordinal);
        foreach (var edge in graph.Edges)
            if (edge is null || string.IsNullOrWhiteSpace(edge.Id) || edge.Id.Length > 100 || !edges.Add(edge.Id) ||
                edge.Source is null || edge.Target is null || !nodes.Contains(edge.Source) || !nodes.Contains(edge.Target) || edge.Capacity < 0)
                throw new ArgumentException("Arestas devem ter IDs únicos, extremos existentes e capacidade inteira não negativa.");
    }
}
