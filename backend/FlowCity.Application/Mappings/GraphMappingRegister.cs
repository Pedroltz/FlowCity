using FlowCity.Domain.Graph;
using Mapster;

namespace FlowCity.Application.Mappings;

public sealed class GraphMappingRegister : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Graph, Graph>()
            .Ignore(destination => destination.Id)
            .Ignore(destination => destination.Nodes)
            .Ignore(destination => destination.Edges);
        config.NewConfig<GraphNode, GraphNode>();
        config.NewConfig<GraphEdge, GraphEdge>()
            .Map(destination => destination.Flow, source => 0L);
        config.NewConfig<Graph, GraphSummary>()
            .Map(destination => destination.NodeCount, source => source.Nodes.Count)
            .Map(destination => destination.EdgeCount, source => source.Edges.Count);
    }
}
