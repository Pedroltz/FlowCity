using FluentValidation;
using System.Text;
using System.Text.Json;
using FlowCity.Application;
using FlowCity.Domain;
using FlowCity.Domain.Graph;
using Xunit;
using Xunit.Abstractions;
namespace FlowCity.Tests;

public class ExperimentTests(ITestOutputHelper output)
{
    [Fact] public void CompareThreeDatasets()
    {
        var csv = new StringBuilder("dataset,vertices,arestas,fluxo_maximo,caminhos_aumentantes,tempo_mediano_ms,tempo_min_ms,tempo_max_ms,repeticoes\n");
        var files = Directory.GetFiles(Path.Combine(AppContext.BaseDirectory,"datasets"),"*.json").Order().ToArray();
        Assert.Equal(3,files.Length);
        foreach (var file in files)
        {
            var graph = JsonSerializer.Deserialize<Graph>(File.ReadAllText(file),new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            var source = graph.Nodes[0].Id; var sink = graph.Nodes[^1].Id;
            var algorithm = new FordFulkerson(new GraphValidator());
            for (var i=0;i<5;i++) algorithm.Calculate(graph,source,sink);
            var results = Enumerable.Range(0,30).Select(_ => algorithm.Calculate(graph,source,sink)).ToArray();
            var result = results[0];
            Assert.All(results,r => Assert.Equal(result.MaxFlow,r.MaxFlow));
            // Certificado independente de otimalidade: corte residual e conservação.
            new AlgorithmTests().KnownFlowsAndInvariants(graph,source,sink,result.MaxFlow);
            Assert.Equal(graph.Nodes.Count == 6 ? 23L : 32L, result.MaxFlow);
            var times = results.Select(r => r.ExecutionTimeMs).Order().ToArray();
            var line = FormattableString.Invariant($"{Path.GetFileNameWithoutExtension(file)},{graph.Nodes.Count},{graph.Edges.Count},{result.MaxFlow},{result.Iterations},{(times[14]+times[15])/2:F6},{times[0]:F6},{times[^1]:F6},30");
            csv.AppendLine(line); output.WriteLine(line);
        }
        var path = Environment.GetEnvironmentVariable("FLOWCITY_EXPERIMENT_OUTPUT");
        if (!string.IsNullOrWhiteSpace(path)) { Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!); File.WriteAllText(path,csv.ToString()); }
    }
}
