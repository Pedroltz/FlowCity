using FlowCity.Api.Controllers;
using FlowCity.Application;
using FlowCity.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Xunit;
using System.Text.Json;

namespace FlowCity.Tests;

public class ResilienceTests
{
    private static CaseStudiesController Controller() => new(new ResilienceService(new FordFulkerson(new GraphValidator())));
    [Theory]
    [InlineData("abilene")]
    [InlineData("atlanta")]
    [InlineData("ta2")]
    public void CatalogAndFailureScenariosAreConsistent(string id)
    {
        var controller = Controller();
        var study = (JsonElement)Assert.IsType<OkObjectResult>(controller.Get(id)).Value!;
        var nodes = study.GetProperty("graph").GetProperty("nodes").EnumerateArray().ToArray();
        var source = nodes[0].GetProperty("id").GetString()!;
        var sink = nodes[^1].GetProperty("id").GetString()!;
        var links = study.GetProperty("links").EnumerateArray().Select(l => l.GetProperty("id").GetString()!).ToArray();
        JsonElement Run(string[] failed) => JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(controller.Analyze(id, new(source, sink, failed), default)).Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var normal = Run([]); var failed = Run(links); var repeated = Run([]);
        Assert.Equal(normal.GetProperty("baseline").GetProperty("maxFlow").GetInt64(), normal.GetProperty("scenario").GetProperty("maxFlow").GetInt64());
        Assert.Equal(0, failed.GetProperty("scenario").GetProperty("maxFlow").GetInt64());
        Assert.Equal(normal.GetProperty("baseline").GetProperty("maxFlow").GetInt64(), repeated.GetProperty("baseline").GetProperty("maxFlow").GetInt64());
        Assert.Equal(normal.GetProperty("baseline").GetProperty("maxFlow").GetInt64(), normal.GetProperty("baselineCut").GetProperty("capacity").GetInt64());
        Assert.Throws<ArgumentException>(() => controller.Analyze(id, new(source, sink, ["unknown"]), default));
    }
    [Fact]
    public void ZeroBaselineHasNoLossPercentage()
    {
        var service = new ResilienceService(new ZeroFlowAlgorithm());
        var study = service.Get("abilene")!.Value;
        var nodes = study.GetProperty("graph").GetProperty("nodes").EnumerateArray().ToArray();
        var result = service.Analyze("abilene", new(nodes[0].GetProperty("id").GetString()!, nodes[^1].GetProperty("id").GetString()!, []), default)!;
        Assert.Equal(0, result.LostCapacity);
        Assert.Null(result.LossPercent);
    }
    private sealed class ZeroFlowAlgorithm : FlowCity.Domain.Interfaces.IMaxFlowAlgorithm
    {
        public FlowCity.Domain.MaxFlowResult Calculate(FlowCity.Domain.Graph.Graph graph, string source, string sink, CancellationToken cancellationToken = default)
            => new(0, 0, 0, [], [], []);
    }
}
