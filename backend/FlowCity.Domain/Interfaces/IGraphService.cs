using FlowCity.Domain.Graph;
using GraphEntity = FlowCity.Domain.Graph.Graph;

namespace FlowCity.Domain.Interfaces;

public interface IGraphService
{
    Task<IReadOnlyList<GraphSummary>> ListAsync(CancellationToken ct);
    Task<GraphEntity?> GetAsync(Guid id, CancellationToken ct);
    Task<GraphEntity> CreateAsync(GraphEntity graph, CancellationToken ct);
    Task<GraphEntity?> UpdateAsync(Guid id, GraphEntity incoming, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
    Task<MaxFlowResult?> CalculateAsync(Guid id, string source, string sink, CancellationToken ct);
}
