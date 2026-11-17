using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FlowCity.Api.Initialization;
using FlowCity.Application;
using FlowCity.Domain;
using FlowCity.Domain.Graph;
using FlowCity.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FlowCity.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string database = Path.Combine(Path.GetTempPath(), $"flowcity-tests-{Guid.NewGuid():N}.db");
    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureAppConfiguration((_, config) =>
        config.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:FlowCity"] = $"Data Source={database};Pooling=False" }));
    protected override void Dispose(bool disposing) { base.Dispose(disposing); if (disposing) File.Delete(database); }
}

public class ApiTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory factory;
    private readonly HttpClient client;
    public ApiTests(ApiFactory factory) { this.factory = factory; client = factory.CreateClient(); }
    [Fact]
    public async Task FullDemoWorkflowPersistsChangesAndReturnsResidual()
    {
        var graph = AlgorithmTests.Make(("A", "B", 20), ("B", "C", 15));
        graph.Edges[0].Flow = 999;
        var response = await client.PostAsJsonAsync("/api/graphs", graph);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var saved = (await response.Content.ReadFromJsonAsync<Graph>())!;
        Assert.NotEqual(Guid.Empty, saved.Id);
        Assert.All(saved.Edges, edge => Assert.Equal(0, edge.Flow));
        Assert.NotNull(response.Headers.Location);
        saved.Name = "Rede editada";
        saved.Description = "Metadados atualizados";
        var node = saved.Nodes.Single(n => n.Id == "B");
        node.Name = "Cruzamento central";
        node.X = 120;
        node.Y = 80;
        saved.Edges[1].Capacity = 12;
        saved.Edges[1].Flow = 999;
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/graphs/{saved.Id}", saved)).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var persisted = await scope.ServiceProvider.GetRequiredService<FlowCityDbContext>().Graphs.AsNoTracking().SingleAsync(g => g.Id == saved.Id);
            Assert.Equal(12, persisted.Edges.Single(e => e.Target == "C").Capacity);
            Assert.Equal("Rede editada", persisted.Name);
            Assert.Equal("Metadados atualizados", persisted.Description);
            var persistedNode = persisted.Nodes.Single(n => n.Id == "B");
            Assert.Equal("Cruzamento central", persistedNode.Name);
            Assert.Equal(120, persistedNode.X);
            Assert.Equal(80, persistedNode.Y);
            Assert.All(persisted.Edges, edge => Assert.Equal(0, edge.Flow));
        }
        var calculation = await client.PostAsJsonAsync($"/api/graphs/{saved.Id}/max-flow", new { source = "A", sink = "C" });
        calculation.EnsureSuccessStatusCode();
        var result = (await calculation.Content.ReadFromJsonAsync<MaxFlowResult>())!;
        Assert.Equal(12, result.MaxFlow); Assert.Equal(1, result.Iterations);
        Assert.Contains(result.ResidualNetwork, e => e.IsReverse && e.ResidualCapacity == 12);
        var again = (await client.GetFromJsonAsync<Graph>($"/api/graphs/{saved.Id}"))!;
        Assert.All(again.Edges, e => Assert.Equal(0, e.Flow));
        // Adição e remoção simultâneas também precisam sobreviver ao tracking das owned entities.
        again.Nodes.RemoveAll(n => n.Id == "B"); again.Edges.Clear();
        again.Edges.Add(new() { Id = "new", Source = "A", Target = "C", Capacity = 3 });
        (await client.PutAsJsonAsync($"/api/graphs/{saved.Id}", again)).EnsureSuccessStatusCode();
        var updated = (await client.GetFromJsonAsync<Graph>($"/api/graphs/{saved.Id}"))!;
        Assert.Equal(2, updated.Nodes.Count); Assert.Single(updated.Edges);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/graphs/{saved.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/graphs/{saved.Id}")).StatusCode);
    }
    [Fact]
    public async Task InvalidInputsHaveBadRequestAndUnknownGraphsHaveNotFound()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/graphs", AlgorithmTests.Make(("A", "B", -5)))).StatusCode);
        var saved = (await (await client.PostAsJsonAsync("/api/graphs", AlgorithmTests.Make(("A", "B", 1)))).Content.ReadFromJsonAsync<Graph>())!;
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync($"/api/graphs/{saved.Id}/max-flow", new { source = "A", sink = "A" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync($"/api/graphs/{Guid.NewGuid()}/max-flow", new { source = "A", sink = "B" })).StatusCode);
        using var invalid = new StringContent("{\"name\":\"Inválido\",\"nodes\":[],\"edges\":[{\"capacity\":1.5}]}", System.Text.Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/graphs", invalid)).StatusCode);
    }
    [Fact]
    public async Task ExampleJsonWithoutIdsOrCoordinatesCanBeImported()
    {
        using var json = new StringContent("""
            {"name":"Importação","nodes":[{"id":"A","name":"Entrada"},{"id":"B","name":"Saída"}],"edges":[{"source":"A","target":"B","capacity":9}]}
            """, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/graphs", json); response.EnsureSuccessStatusCode();
        var graph = (await response.Content.ReadFromJsonAsync<Graph>())!;
        Assert.False(string.IsNullOrWhiteSpace(graph.Edges[0].Id));
        Assert.Equal("", graph.Description);
        var calculation = await client.PostAsJsonAsync($"/api/graphs/{graph.Id}/max-flow", new { source = "A", sink = "B" });
        Assert.Equal(9, (await calculation.Content.ReadFromJsonAsync<MaxFlowResult>())!.MaxFlow);
    }
    [Fact]
    public async Task SeedContainsThreeDatasetsAndSwaggerIsAvailable()
    {
        var graphs = (await client.GetFromJsonAsync<JsonElement>("/api/graphs")).EnumerateArray().ToArray();
        var expectedExamples = new[]
        {
            ("Rede residual pequena · 6 nós", 6, 10),
            ("Rede residual média · 20 nós", 20, 68),
            ("Rede residual grande · 100 nós", 100, 401),
        };
        foreach (var (name, nodeCount, edgeCount) in expectedExamples)
        {
            var summary = Assert.Single(graphs, graph =>
                graph.GetProperty("name").GetString() == name
                && graph.GetProperty("nodeCount").GetInt32() == nodeCount
                && graph.GetProperty("edgeCount").GetInt32() == edgeCount);
            var full = await client.GetFromJsonAsync<Graph>(
                $"/api/graphs/{summary.GetProperty("id").GetGuid()}");
            Assert.NotNull(full);
            Assert.Contains(full.Nodes, node => node.Id == "s" && node.Name == "s");
            Assert.Contains(full.Nodes, node => node.Id == "t" && node.Name == "t");
            Assert.All(full.Nodes, node => Assert.Equal(node.Id, node.Name));
        }
        Assert.All(graphs, graph => Assert.NotEqual(Guid.Empty, graph.GetProperty("id").GetGuid()));
        var swagger = await client.GetFromJsonAsync<JsonElement>("/swagger/v1/swagger.json");
        var schemas = swagger.GetProperty("components").GetProperty("schemas");
        var edgeProperties = schemas.GetProperty("GraphEdgeRequestDTO").GetProperty("properties");
        Assert.False(edgeProperties.TryGetProperty("flow", out _));
        var graphProperties = schemas.GetProperty("GraphRequestDTO").GetProperty("properties");
        Assert.EndsWith("/GraphNodeRequestDTO", graphProperties.GetProperty("nodes").GetProperty("items").GetProperty("$ref").GetString());
        Assert.EndsWith("/GraphEdgeRequestDTO", graphProperties.GetProperty("edges").GetProperty("items").GetProperty("$ref").GetString());
    }

    [Fact]
    public async Task ExistingPresentationExampleIsRenamedAndKeepsItsFlow()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<FlowCityDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var db = new FlowCityDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var examples = new[]
        {
            ("Centro · 6 cruzamentos", "01-pequeno"),
            ("Bairros · 20 cruzamentos", "02-medio"),
            ("Malha urbana · 100 cruzamentos", "03-grande"),
        };
        var expectedCapacities = new Dictionary<string, Dictionary<string, int>>();
        foreach (var (oldName, fileName) in examples)
        {
            var json = await File.ReadAllTextAsync(
                Path.Combine(AppContext.BaseDirectory, "datasets", fileName + ".json"));
            var current = JsonSerializer.Deserialize<Graph>(
                json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            var oldIds = fileName == "01-pequeno"
                ? new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["s"] = "S",
                    ["a"] = "A",
                    ["b"] = "B",
                    ["c"] = "C",
                    ["d"] = "D",
                    ["t"] = "T",
                }
                : current.Nodes.Select((node, index) =>
                        (node.Id, OldId: $"N{index + 1:000}"))
                    .ToDictionary(pair => pair.Id, pair => pair.OldId, StringComparer.Ordinal);
            var graph = new Graph
            {
                Name = oldName,
                Description = "Antiga rede urbana",
                Nodes = current.Nodes.Select(node => new GraphNode
                {
                    Id = oldIds[node.Id],
                    Name = "Rótulo antigo",
                    X = node.X,
                    Y = node.Y,
                }).ToList(),
                Edges = current.Edges.Select(edge => new GraphEdge
                {
                    Id = edge.Id,
                    Source = oldIds[edge.Source],
                    Target = oldIds[edge.Target],
                    Capacity = edge.Capacity,
                }).ToList(),
            };
            expectedCapacities[fileName] = graph.Edges.ToDictionary(edge => edge.Id, edge => edge.Capacity);
            db.Graphs.Add(graph);
        }
        await db.SaveChangesAsync();

        await new DatabaseInitializer(db, new GraphValidator()).InitializeAsync();

        var migrated = await db.Graphs
            .Include(graph => graph.Nodes)
            .Include(graph => graph.Edges)
            .ToArrayAsync();
        Assert.Equal(3, migrated.Length);
        Assert.All(migrated, graph =>
        {
            Assert.StartsWith("Rede residual", graph.Name);
            Assert.All(graph.Nodes, node => Assert.Equal(node.Id, node.Name));
            Assert.Contains(graph.Nodes, node => node.Id == "s");
            Assert.Contains(graph.Nodes, node => node.Id == "t");
            Assert.Equal(expectedCapacities[graph.Name.Contains("pequena") ? "01-pequeno" :
                graph.Name.Contains("média") ? "02-medio" : "03-grande"],
                graph.Edges.ToDictionary(edge => edge.Id, edge => edge.Capacity));
        });
        var small = migrated.Single(graph => graph.Name.Contains("pequena"));
        Assert.Equal(23, new FordFulkerson(new GraphValidator()).Calculate(small, "s", "t").MaxFlow);
    }
}
