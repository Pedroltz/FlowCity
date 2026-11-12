using FluentValidation;
using FlowCity.Application;
using FlowCity.Domain;
using FlowCity.Domain.Graph;
using Xunit;
namespace FlowCity.Tests;

public class AlgorithmTests
{
    internal static Graph Make(params (string From, string To, int Capacity)[] edges) => new()
    {
        Name = "Teste", Nodes = edges.SelectMany(e => new[] { e.From, e.To }).Distinct().Select(id => new GraphNode { Id = id, Name = id }).ToList(),
        Edges = edges.Select((e, i) => new GraphEdge { Id = $"e{i}", Source = e.From, Target = e.To, Capacity = e.Capacity }).ToList()
    };
    public static TheoryData<Graph, string, string, long> Cases => new()
    {
        { Make(("A","B",7)), "A", "B", 7 },
        { Make(("A","B",20),("B","C",3)), "A", "C", 3 },
        { Make(("A","B",8),("A","C",5),("B","D",8),("C","D",5)), "A", "D", 13 },
        { Make(("A","B",0)), "A", "B", 0 },
        { Make(("A","B",4),("C","D",8)), "A", "D", 0 },
        { Make(("B","A",4)), "A", "B", 0 },
        { Make(("A","B",8),("B","C",5),("C","A",9),("C","D",4)), "A", "D", 4 },
        { Make(("A","B",3),("A","B",4),("B","A",8),("B","C",10)), "A", "C", 7 },
        { Make(("A","A",20),("A","B",6)), "A", "B", 6 },
        { Make(("A","B",int.MaxValue),("A","B",int.MaxValue)), "A", "B", 4294967294L },
        { Make(("S","A",16),("S","C",13),("A","C",10),("C","A",4),("A","B",12),("B","C",9),("C","D",14),("D","B",7),("B","T",20),("D","T",4)), "S", "T", 23 }
    };
    [Theory, MemberData(nameof(Cases))]
    public void KnownFlowsAndInvariants(Graph graph, string source, string sink, long expected)
    {
        var result = new FordFulkerson(new GraphValidator()).Calculate(graph, source, sink);
        Assert.Equal(expected, result.MaxFlow);
        Assert.Equal(expected, result.AugmentingPaths.Sum(p => p.AddedFlow));
        Assert.Equal(result.Iterations, result.AugmentingPaths.Count);
        foreach (var e in result.Edges)
        {
            Assert.InRange(e.Flow, 0, e.Capacity);
            Assert.Equal(e.Capacity - e.Flow, e.ResidualCapacity);
            Assert.Equal(e.Flow, result.ResidualNetwork.Single(r => r.OriginalEdgeId == e.Id && r.IsReverse).ResidualCapacity);
        }
        foreach (var n in graph.Nodes.Where(n => n.Id != source && n.Id != sink))
            Assert.Equal(result.Edges.Where(e => e.Target == n.Id).Sum(e => e.Flow), result.Edges.Where(e => e.Source == n.Id).Sum(e => e.Flow));
        Assert.All(graph.Edges, e => Assert.Equal(0, e.Flow));
        // Certificado independente: capacidade do corte alcançável no residual = fluxo máximo.
        var reachable = new HashSet<string> { source };
        while (true)
        {
            var next = result.ResidualNetwork.Where(e => e.ResidualCapacity > 0 && reachable.Contains(e.Source)).Select(e => e.Target).ToArray();
            var count = reachable.Count; reachable.UnionWith(next); if (count == reachable.Count) break;
        }
        Assert.DoesNotContain(sink, reachable);
        Assert.Equal(expected, result.Edges.Where(e => reachable.Contains(e.Source) && !reachable.Contains(e.Target)).Sum(e => (long)e.Capacity));
    }
    [Fact] public void ReverseArcCancelsEarlierFlow()
    {
        var graph = Make(("S","A",1),("S","B",1),("A","C",1),("A","D",1),("B","C",1),("C","T",1),("D","T",1));
        var result = new FordFulkerson(new GraphValidator()).Calculate(graph,"S","T");
        Assert.Equal(2, result.MaxFlow);
        Assert.Contains(result.AugmentingPaths.SelectMany(p => p.Edges), e => e.IsReverse && e.Source == "C" && e.Target == "A");
        Assert.Equal(0, result.Edges.Single(e => e.Source == "A" && e.Target == "C").Flow);
    }
    [Fact] public void RejectsSameOrMissingEndpoints()
    {
        var graph = Make(("A","B",1)); var algorithm = new FordFulkerson(new GraphValidator());
        Assert.Throws<ArgumentException>(() => algorithm.Calculate(graph,"A","A"));
        Assert.Throws<ArgumentException>(() => algorithm.Calculate(graph,"A","Z"));
    }
    [Fact] public void RejectsInvalidGraph()
    {
        var graph = Make(("A","B",-1));
        Assert.Throws<ValidationException>(() => new GraphValidator().ValidateAndThrow(graph));
        graph.Edges[0].Capacity = 1; graph.Nodes.Add(new() { Id = "A", Name = "Duplicado" });
        Assert.Throws<ValidationException>(() => new GraphValidator().ValidateAndThrow(graph));
    }
    [Fact] public void IsolatedVertexHasZeroFlow()
    {
        var graph = Make(("A","B",1)); graph.Nodes.Add(new() { Id = "Z", Name = "Isolado" });
        Assert.Equal(0, new FordFulkerson(new GraphValidator()).Calculate(graph,"A","Z").MaxFlow);
    }
}
