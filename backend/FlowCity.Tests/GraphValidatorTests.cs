using FlowCity.Application;
using FlowCity.Domain.Graph;
using FluentValidation;
using Xunit;

namespace FlowCity.Tests;

public class GraphValidatorTests
{
    [Theory]
    [InlineData("name")]
    [InlineData("description")]
    [InlineData("nullNodes")]
    [InlineData("nullEdges")]
    [InlineData("nullNode")]
    [InlineData("nullEdge")]
    [InlineData("nodeId")]
    [InlineData("nodeName")]
    [InlineData("duplicateNode")]
    [InlineData("duplicateEdge")]
    [InlineData("coordinate")]
    [InlineData("capacity")]
    [InlineData("missingEndpoint")]
    [InlineData("nullEndpoint")]
    public void InvalidGraphsReturnValidationFailuresInsteadOfCrashing(string scenario)
    {
        var graph = AlgorithmTests.Make(("A", "B", 1));
        switch (scenario)
        {
            case "name": graph.Name = " "; break;
            case "description": graph.Description = null!; break;
            case "nullNodes": graph.Nodes = null!; break;
            case "nullEdges": graph.Edges = null!; break;
            case "nullNode": graph.Nodes.Add(null!); break;
            case "nullEdge": graph.Edges.Add(null!); break;
            case "nodeId": graph.Nodes[0].Id = ""; break;
            case "nodeName": graph.Nodes[0].Name = " "; break;
            case "duplicateNode": graph.Nodes.Add(new() { Id = "A", Name = "Duplicado" }); break;
            case "duplicateEdge": graph.Edges.Add(new() { Id = graph.Edges[0].Id, Source = "A", Target = "B" }); break;
            case "coordinate": graph.Nodes[0].X = double.NaN; break;
            case "capacity": graph.Edges[0].Capacity = -1; break;
            case "missingEndpoint": graph.Edges[0].Target = "a"; break;
            case "nullEndpoint": graph.Edges[0].Source = null!; break;
        }

        var validator = new GraphValidator();
        var result = validator.Validate(graph);
        Assert.False(result.IsValid);
        Assert.NotEmpty(result.Errors);
        Assert.Throws<ValidationException>(() => validator.ValidateAndThrow(graph));
    }

    [Fact]
    public void ExactLimitsAreAcceptedAndExcessIsRejected()
    {
        var graph = new Graph
        {
            Name = new string('N', 200), Description = new string('D', 5000),
            Nodes = Enumerable.Range(0, 500).Select(i => new GraphNode
                { Id = i.ToString().PadLeft(100, '0'), Name = new string('V', 200) }).ToList()
        };
        graph.Edges = Enumerable.Range(0, 5000).Select(i => new GraphEdge
        {
            Id = i.ToString().PadLeft(100, '0'), Source = graph.Nodes[0].Id,
            Target = graph.Nodes[^1].Id, Capacity = int.MaxValue
        }).ToList();
        var validator = new GraphValidator();
        Assert.True(validator.Validate(graph).IsValid);
        graph.Name += "N";
        Assert.False(validator.Validate(graph).IsValid);
        graph.Name = "Rede";
        graph.Nodes.Add(new() { Id = "extra", Name = "Extra" });
        Assert.False(validator.Validate(graph).IsValid);
        graph.Nodes.RemoveAt(500);
        graph.Edges.Add(new() { Id = "extra", Source = graph.Nodes[0].Id, Target = graph.Nodes[^1].Id });
        Assert.False(validator.Validate(graph).IsValid);
    }

    [Fact]
    public void EmptyGraphAndCaseSensitiveIdsRemainValid()
    {
        var validator = new GraphValidator();
        Assert.True(validator.Validate(new Graph { Name = "Vazia" }).IsValid);
        Assert.True(validator.Validate(AlgorithmTests.Make(("A", "a", 0))).IsValid);
    }
}
