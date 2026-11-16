using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FlowCity.Tests;

public sealed class ResilienceApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient client = factory.CreateClient();
    [Theory]
    [InlineData("abilene", 12, 15)]
    [InlineData("atlanta", 15, 22)]
    [InlineData("ta2", 65, 108)]
    public async Task PhysicalFailuresAreIndependentAndDoNotMutateCatalog(string id, int vertices, int count)
    {
        var before = await client.GetStringAsync($"/api/case-studies/{id}");
        using var doc = JsonDocument.Parse(before);
        var study = doc.RootElement;
        Assert.Equal(vertices, study.GetProperty("graph").GetProperty("nodes").GetArrayLength());
        var links = study.GetProperty("links").EnumerateArray().ToArray();
        Assert.Equal(count, links.Length);
        var edgeIds = links.SelectMany(l => l.GetProperty("edgeIds").EnumerateArray().Select(e => e.GetString())).ToArray();
        Assert.Equal(edgeIds.Length, edgeIds.Distinct().Count());
        Assert.Equal(
            links.Sum(l => l.GetProperty("directed").GetBoolean() ? 1 : 2),
            edgeIds.Length);
        var nodes = study.GetProperty("graph").GetProperty("nodes").EnumerateArray().ToArray();
        var source = nodes[0].GetProperty("id").GetString(); var sink = nodes[^1].GetProperty("id").GetString();
        var failedId = id == "atlanta" ? "L15" : links[0].GetProperty("id").GetString();
        var link = links.Single(l => l.GetProperty("id").GetString() == failedId);
        var response = await client.PostAsJsonAsync($"/api/case-studies/{id}/resilience", new { source, sink, failedLinkIds = new[] { failedId, failedId } });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        var baseline = result.GetProperty("baseline"); var scenario = result.GetProperty("scenario");
        var baselineFlow = baseline.GetProperty("maxFlow").GetInt64();
        var scenarioFlow = scenario.GetProperty("maxFlow").GetInt64();
        Assert.True(scenarioFlow < baselineFlow);
        Assert.Equal(baselineFlow - scenarioFlow, result.GetProperty("lostCapacity").GetInt64());
        Assert.True(result.GetProperty("lossPercent").GetDouble() > 0);
        var ids = link.GetProperty("edgeIds").EnumerateArray().Select(e => e.GetString()).ToHashSet();
        Assert.All(scenario.GetProperty("edges").EnumerateArray().Where(e => ids.Contains(e.GetProperty("id").GetString())), e => { Assert.Equal(0, e.GetProperty("capacity").GetInt32()); Assert.Equal(0, e.GetProperty("flow").GetInt64()); });
        foreach (var label in new[] { "baseline", "scenario" })
        {
            Assert.Equal(result.GetProperty(label).GetProperty("maxFlow").GetInt64(), result.GetProperty(label + "Cut").GetProperty("capacity").GetInt64());
        }
        Assert.Equal(before, await client.GetStringAsync($"/api/case-studies/{id}"));
        var all = links.Select(l => l.GetProperty("id").GetString()).ToArray();
        var disconnected = await client.PostAsJsonAsync($"/api/case-studies/{id}/resilience", new { source, sink, failedLinkIds = all });
        disconnected.EnsureSuccessStatusCode();
        var noFlow = await disconnected.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, noFlow.GetProperty("scenario").GetProperty("maxFlow").GetInt64());
        Assert.Equal(0, noFlow.GetProperty("scenario").GetProperty("iterations").GetInt32());
    }
    [Fact]
    public async Task CatalogExposesAllPinnedSndlibTopologiesAndDirections()
    {
        var expected = new[]
        {
            "abilene", "atlanta", "brain", "cost266", "dfn-bwin", "dfn-gwin",
            "di-yuan", "france", "geant", "germany50", "giul39", "india35",
            "janos-us", "janos-us-ca", "newyork", "nobel-eu", "nobel-germany",
            "nobel-us", "norway", "pdh", "pioro40", "polska", "sun", "ta1",
            "ta2", "zib54",
        };
        var catalog = await client.GetFromJsonAsync<JsonElement[]>("/api/case-studies");
        Assert.NotNull(catalog);
        Assert.Equal(expected, catalog.Select(s => s.GetProperty("id").GetString()));

        foreach (var id in new[] { "giul39", "janos-us", "janos-us-ca", "sun", "zib54" })
        {
            var study = await client.GetFromJsonAsync<JsonElement>($"/api/case-studies/{id}");
            Assert.All(study.GetProperty("links").EnumerateArray(), link =>
            {
                Assert.True(link.GetProperty("directed").GetBoolean());
                Assert.Single(link.GetProperty("edgeIds").EnumerateArray());
            });
        }
    }
    [Fact]
    public async Task ValidationAndNotFoundHaveHttpContracts()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/case-studies/unknown")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/case-studies/unknown/resilience", new { source = "A", sink = "B", failedLinkIds = Array.Empty<string>() })).StatusCode);
        var study = await client.GetFromJsonAsync<JsonElement>("/api/case-studies/abilene");
        var nodes = study.GetProperty("graph").GetProperty("nodes").EnumerateArray().ToArray();
        var source = nodes[0].GetProperty("id").GetString(); var sink = nodes[^1].GetProperty("id").GetString();
        foreach (var request in new object[] { new { source, sink = source, failedLinkIds = Array.Empty<string>() }, new { source = "unknown", sink, failedLinkIds = Array.Empty<string>() }, new { source, sink, failedLinkIds = new[] { "unknown" } } })
        {
            var response = await client.PostAsJsonAsync("/api/case-studies/abilene/resilience", request);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
        var catalog = await client.GetFromJsonAsync<JsonElement>("/api/case-studies"); Assert.Equal(26, catalog.GetArrayLength());
    }
}
