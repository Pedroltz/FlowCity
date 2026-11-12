using FlowCity.Domain.Graph;
using FlowCity.Domain.Interfaces;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace FlowCity.Infrastructure.Repositories;

public sealed class GraphRepository : IGraphRepository
{
    private readonly FlowCityDbContext _db;
    private readonly TypeAdapterConfig _mappingConfig;

    public GraphRepository(FlowCityDbContext db, TypeAdapterConfig mappingConfig)
    {
        _db = db;
        _mappingConfig = mappingConfig;
    }

    public async Task<IReadOnlyList<GraphSummary>> ListAsync(CancellationToken ct) =>
        await _db.Graphs.AsNoTracking().ProjectToType<GraphSummary>(_mappingConfig).ToListAsync(ct);

    public Task<Graph?> GetAsync(Guid id, bool tracking, CancellationToken ct)
    {
        var query = tracking ? _db.Graphs : _db.Graphs.AsNoTracking();
        return query.SingleOrDefaultAsync(graph => graph.Id == id, ct);
    }

    public void Add(Graph graph) => _db.Graphs.Add(graph);
    public void Remove(Graph graph) => _db.Graphs.Remove(graph);
    public async Task SaveChangesAsync(CancellationToken ct) => await _db.SaveChangesAsync(ct);
}