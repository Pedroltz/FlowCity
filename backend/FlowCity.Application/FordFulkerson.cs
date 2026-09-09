using System.Diagnostics;
using FlowCity.Domain;
namespace FlowCity.Application;

/// <summary>Ford-Fulkerson com BFS (Edmonds-Karp), O(V E²). Não altera o grafo recebido.</summary>
public sealed class FordFulkerson
{
    private sealed class Arc(int from, int to, int edgeIndex, bool reverse, long residual)
    {
        public int From { get; } = from;
        public int To { get; } = to;
        public int EdgeIndex { get; } = edgeIndex;
        public bool Reverse { get; } = reverse;
        public long Residual { get; set; } = residual;
        public Arc Pair { get; set; } = null!;
    }

    public MaxFlowResult Calculate(Graph graph, string source, string sink, CancellationToken cancellationToken = default)
    {
        GraphValidator.Validate(graph);
        var indices = graph.Nodes.Select((n, i) => (n.Id, i)).ToDictionary(x => x.Id, x => x.i);
        if (source is null || sink is null || !indices.TryGetValue(source, out var start) || !indices.TryGetValue(sink, out var end))
            throw new ArgumentException("Origem e destino devem existir na rede.");
        if (start == end) throw new ArgumentException("Origem e destino devem ser diferentes.");
        var watch = Stopwatch.StartNew();
        var adjacency = Enumerable.Range(0, graph.Nodes.Count).Select(_ => new List<Arc>()).ToArray();
        var forward = new List<Arc>();
        for (var i = 0; i < graph.Edges.Count; i++)
        {
            var edge = graph.Edges[i];
            var a = new Arc(indices[edge.Source], indices[edge.Target], i, false, edge.Capacity);
            var b = new Arc(a.To, a.From, i, true, 0);
            a.Pair = b; b.Pair = a;
            adjacency[a.From].Add(a); adjacency[b.From].Add(b); forward.Add(a);
        }
        long total = 0;
        var paths = new List<AugmentingPath>();
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var parents = new Arc?[graph.Nodes.Count];
            var visited = new bool[graph.Nodes.Count];
            var queue = new Queue<int>(); queue.Enqueue(start); visited[start] = true;
            while (queue.Count > 0 && !visited[end])
            {
                cancellationToken.ThrowIfCancellationRequested();
                foreach (var arc in adjacency[queue.Dequeue()])
                {
                    if (arc.Residual <= 0 || visited[arc.To]) continue;
                    visited[arc.To] = true; parents[arc.To] = arc; queue.Enqueue(arc.To);
                    if (arc.To == end) break;
                }
            }
            if (!visited[end]) break;
            var route = new List<Arc>();
            for (var v = end; v != start; v = parents[v]!.From) route.Add(parents[v]!);
            route.Reverse();
            var bottleneck = route.Min(a => a.Residual);
            // Registrar capacidades ANTES da atualização, inclusive nas arestas de cancelamento.
            var segments = route.Select(a => new PathSegment(graph.Edges[a.EdgeIndex].Id,
                graph.Nodes[a.From].Id, graph.Nodes[a.To].Id, a.Residual, a.Reverse)).ToArray();
            foreach (var arc in route) { arc.Residual -= bottleneck; arc.Pair.Residual += bottleneck; }
            total += bottleneck;
            paths.Add(new(paths.Count + 1, new[] { source }.Concat(segments.Select(a => a.Target)).ToArray(), segments, bottleneck, bottleneck));
        }
        var edges = forward.Select(a => { var e = graph.Edges[a.EdgeIndex];
            return new FlowEdge(e.Id, e.Source, e.Target, e.Capacity, a.Pair.Residual, a.Residual); }).ToArray();
        // Mantém também resíduos zero para permitir auditoria; a interface pode ocultá-los.
        var residual = forward.SelectMany(a => new[] { a, a.Pair }).Select(a => new ResidualEdge(
            $"{graph.Edges[a.EdgeIndex].Id}:{(a.Reverse ? "reverse" : "forward")}", graph.Edges[a.EdgeIndex].Id,
            graph.Nodes[a.From].Id, graph.Nodes[a.To].Id, a.Residual, a.Reverse)).ToArray();
        watch.Stop();
        return new(total, watch.Elapsed.TotalMilliseconds, paths.Count, paths, edges, residual);
    }
}
