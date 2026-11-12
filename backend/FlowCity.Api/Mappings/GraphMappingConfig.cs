using FlowCity.Api.Models;
using FlowCity.Domain.Graph;
using Mapster;

namespace FlowCity.Api.Mappings;

public sealed class GraphMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<GraphNodeRequestDTO, GraphNode>();
        config.NewConfig<GraphEdgeRequestDTO, GraphEdge>()
            .Ignore(destination => destination.Flow);
        config.NewConfig<GraphRequestDTO, Graph>()
            .Ignore(destination => destination.Id)
            .Map(destination => destination.Description, source => source.Description ?? "");
        config.NewConfig<GraphSummary, GraphSummaryDTO>();
    }
}
