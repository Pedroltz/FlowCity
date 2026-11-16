using System.Text.Json;
using FlowCity.Domain;
using FlowCity.Domain.Graph;
using FlowCity.Domain.Interfaces;

namespace FlowCity.Application.Services;

// Benchmarks are read afresh for each operation; scenario changes never reach disk or SQLite.
public sealed class ResilienceService(IMaxFlowAlgorithm algorithm)
{
    private static readonly string[] Names =
    [
        "abilene", "atlanta", "brain", "cost266", "dfn-bwin", "dfn-gwin",
        "di-yuan", "france", "geant", "germany50", "giul39", "india35",
        "janos-us", "janos-us-ca", "newyork", "nobel-eu", "nobel-germany",
        "nobel-us", "norway", "pdh", "pioro40", "polska", "sun", "ta1",
        "ta2", "zib54",
    ];
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    private static JsonElement Read(string id) => JsonSerializer.Deserialize<JsonElement>(
        System.IO.File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "datasets", "case-studies", id + ".json")));

    public IReadOnlyList<JsonElement> List() => Names.Select(Read).ToArray();
    public JsonElement? Get(string id) => Names.Contains(id) ? Read(id) : null;

    public sealed record ResilienceRequest(string Source, string Sink, string[] FailedLinkIds);

    public ResilienceResult? Analyze(string id, ResilienceRequest request, CancellationToken ct)
    {
        if (!Names.Contains(id)) return null;
        var study = Read(id);
        var links = study.GetProperty("links").EnumerateArray().ToArray();
        var failed = (request.FailedLinkIds ?? []).ToHashSet();
        if (failed.Any(f => !links.Any(l => l.GetProperty("id").GetString() == f)))
            throw new ArgumentException("Enlace desconhecido.");
        var original = study.GetProperty("graph").Deserialize<Graph>(Options)!;
        var modified = study.GetProperty("graph").Deserialize<Graph>(Options)!;
        var disabled = links.Where(l => failed.Contains(l.GetProperty("id").GetString()!))
            .SelectMany(l => l.GetProperty("edgeIds").EnumerateArray().Select(e => e.GetString())).ToHashSet();
        foreach (var edge in modified.Edges.Where(e => disabled.Contains(e.Id))) edge.Capacity = 0;
        var baseline = algorithm.Calculate(original, request.Source, request.Sink, ct);
        var scenario = algorithm.Calculate(modified, request.Source, request.Sink, ct);
        return new(baseline, scenario, Cut(baseline, request.Source, ct), Cut(scenario, request.Source, ct),
            baseline.MaxFlow - scenario.MaxFlow,
            baseline.MaxFlow == 0 ? null : 100.0 * (baseline.MaxFlow - scenario.MaxFlow) / baseline.MaxFlow);
    }

    private static MinimumCut Cut(MaxFlowResult result, string source, CancellationToken ct)
    {
        var adjacency = result.ResidualNetwork.Where(e => e.ResidualCapacity > 0)
            .GroupBy(e => e.Source).ToDictionary(group => group.Key, group => group.Select(e => e.Target).ToArray());
        var reachable = new HashSet<string> { source };
        var queue = new Queue<string>();
        queue.Enqueue(source);
        while (queue.Count > 0)
        {
            ct.ThrowIfCancellationRequested();
            if (!adjacency.TryGetValue(queue.Dequeue(), out var neighbors)) continue;
            foreach (var next in neighbors)
                if (reachable.Add(next))
                    queue.Enqueue(next);
        }

        var edges = result.Edges.Where(e => reachable.Contains(e.Source) && !reachable.Contains(e.Target)).ToArray();
        return new(reachable.Order(StringComparer.Ordinal).ToArray(), edges, edges.Sum(e => (long)e.Capacity));
    }
}
