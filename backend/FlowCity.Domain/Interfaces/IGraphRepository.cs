using FlowCity.Domain.Graph;
using GraphEntity = FlowCity.Domain.Graph.Graph;

namespace FlowCity.Domain.Interfaces;

public interface IGraphRepository
{
    Task<IReadOnlyList<GraphSummary>> ListAsync(CancellationToken ct);
    Task<GraphEntity?> GetAsync(Guid id, bool tracking, CancellationToken ct);
    void Add(GraphEntity graph);
    void Remove(GraphEntity graph);
    Task SaveChangesAsync(CancellationToken ct);
}
