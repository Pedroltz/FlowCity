using System.Text.Json;
using FlowCity.Domain.Graph;
using FlowCity.Infrastructure;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace FlowCity.Api.Initialization;

public sealed class DatabaseInitializer(FlowCityDbContext db, IValidator<Graph> validator)
{
    private static readonly (string PreviousName, string FileName)[] LegacyExamples =
    [
        ("Centro · 6 cruzamentos", "01-pequeno"),
        ("Bairros · 20 cruzamentos", "02-medio"),
        ("Malha urbana · 100 cruzamentos", "03-grande"),
    ];

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        // Seed only a newly created database; never recreate deliberately deleted graphs.
        if (!await db.Database.EnsureCreatedAsync(ct))
        {
            await RenameLegacyExamplesAsync(ct);
            return;
        }

        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "datasets"), "*.json").Order())
        {
            var graph = JsonSerializer.Deserialize<Graph>(await File.ReadAllTextAsync(file, ct),
                new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            validator.ValidateAndThrow(graph);
            db.Graphs.Add(graph);
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task RenameLegacyExamplesAsync(CancellationToken ct)
    {
        foreach (var (previousName, fileName) in LegacyExamples)
        {
            var graphs = await db.Graphs
                .Include(value => value.Nodes)
                .Include(value => value.Edges)
                .Where(value => value.Name == previousName)
                .ToArrayAsync(ct);
            if (graphs.Length == 0) continue;

            var replacement = JsonSerializer.Deserialize<Graph>(
                await File.ReadAllTextAsync(
                    Path.Combine(AppContext.BaseDirectory, "datasets", fileName + ".json"), ct),
                new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            foreach (var graph in graphs)
            {
                if (graph.Nodes.Count != replacement.Nodes.Count) continue;

                var nodeIds = BuildLegacyNodeMap(graph, replacement, fileName);
                if (nodeIds is null || graph.Edges.Any(edge =>
                        !nodeIds.ContainsKey(edge.Source) || !nodeIds.ContainsKey(edge.Target)))
                    continue;

                var nodes = graph.Nodes.Select(node => new GraphNode
                {
                    Id = nodeIds[node.Id],
                    Name = nodeIds[node.Id],
                    X = node.X,
                    Y = node.Y,
                }).ToList();
                var edges = graph.Edges.Select(edge => new GraphEdge
                {
                    Id = edge.Id,
                    Source = nodeIds[edge.Source],
                    Target = nodeIds[edge.Target],
                    Capacity = edge.Capacity,
                    Flow = 0,
                }).ToList();

                await using var transaction = await db.Database.BeginTransactionAsync(ct);
                graph.Name = replacement.Name;
                graph.Description = replacement.Description;
                graph.Nodes.Clear();
                graph.Edges.Clear();
                await db.SaveChangesAsync(ct);

                graph.Nodes.AddRange(nodes);
                graph.Edges.AddRange(edges);
                validator.ValidateAndThrow(graph);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
        }
    }

    private static Dictionary<string, string>? BuildLegacyNodeMap(
        Graph graph, Graph replacement, string fileName)
    {
        if (fileName == "01-pequeno")
        {
            var ids = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["S"] = "s",
                ["A"] = "a",
                ["B"] = "b",
                ["C"] = "c",
                ["D"] = "d",
                ["T"] = "t",
            };
            return graph.Nodes.All(node => ids.ContainsKey(node.Id)) && graph.Nodes.Count == ids.Count
                ? ids
                : null;
        }

        var orderedNodes = graph.Nodes
            .Select(node => (Node: node, IsValid: node.Id.Length == 4 && node.Id[0] == 'N'
                && int.TryParse(node.Id.AsSpan(1), out var index) && index > 0))
            .ToArray();
        if (orderedNodes.Any(entry => !entry.IsValid)) return null;

        var normalized = graph.Nodes
            .Select(node => (Node: node, Index: int.Parse(node.Id.AsSpan(1))))
            .OrderBy(entry => entry.Index)
            .ToArray();
        if (normalized.Where((entry, index) => entry.Index != index + 1).Any()) return null;

        return normalized.Select((entry, index) =>
                (OldId: entry.Node.Id, NewId: replacement.Nodes[index].Id))
            .ToDictionary(pair => pair.OldId, pair => pair.NewId, StringComparer.Ordinal);
    }
}
