namespace FlowCity.Api.Models;

public sealed record GraphRequestDTO(string Name, string? Description,
    List<GraphNodeRequestDTO> Nodes, List<GraphEdgeRequestDTO> Edges);
