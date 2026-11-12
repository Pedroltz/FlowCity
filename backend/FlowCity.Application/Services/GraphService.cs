using FlowCity.Domain;
using FlowCity.Domain.Graph;
using FlowCity.Domain.Interfaces;
using FluentValidation;
using MapsterMapper;

namespace FlowCity.Application.Services;

public sealed class GraphService : IGraphService
{
    private readonly IGraphRepository _repository;
    private readonly IValidator<Graph> _validator;
    private readonly IMaxFlowAlgorithm _algorithm;
    private readonly IMapper _mapper;

    public GraphService(IGraphRepository repository, IValidator<Graph> validator,
        IMaxFlowAlgorithm algorithm, IMapper mapper)
    {
        _repository = repository;
        _validator = validator;
        _algorithm = algorithm;
        _mapper = mapper;
    }

    public Task<IReadOnlyList<GraphSummary>> ListAsync(CancellationToken ct) => _repository.ListAsync(ct);

    public Task<Graph?> GetAsync(Guid id, CancellationToken ct) => _repository.GetAsync(id, false, ct);

    public async Task<Graph> CreateAsync(Graph graph, CancellationToken ct)
    {
        _validator.ValidateAndThrow(graph);
        graph.Edges.ForEach(edge => edge.Flow = 0);
        _repository.Add(graph);
        await _repository.SaveChangesAsync(ct);
        return graph;
    }

    public async Task<Graph?> UpdateAsync(Guid id, Graph incoming, CancellationToken ct)
    {
        _validator.ValidateAndThrow(incoming);
        var graph = await _repository.GetAsync(id, true, ct);
        if (graph is null) return null;

        _mapper.Map(incoming, graph);
        // Keep tracked owned entities and reconcile additions/removals by identity.
        graph.Nodes.RemoveAll(node => !incoming.Nodes.Any(value => value.Id == node.Id));
        foreach (var node in incoming.Nodes)
        {
            var current = graph.Nodes.SingleOrDefault(value => value.Id == node.Id);
            if (current is null) graph.Nodes.Add(node);
            else _mapper.Map(node, current);
        }

        graph.Edges.RemoveAll(edge => !incoming.Edges.Any(value => value.Id == edge.Id));
        foreach (var edge in incoming.Edges)
        {
            edge.Flow = 0;
            var current = graph.Edges.SingleOrDefault(value => value.Id == edge.Id);
            if (current is null) graph.Edges.Add(edge);
            else _mapper.Map(edge, current);
        }

        await _repository.SaveChangesAsync(ct);
        return graph;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        var graph = await _repository.GetAsync(id, true, ct);
        if (graph is null) return false;
        _repository.Remove(graph);
        await _repository.SaveChangesAsync(ct);
        return true;
    }

    public async Task<MaxFlowResult?> CalculateAsync(Guid id, string source, string sink, CancellationToken ct)
    {
        var graph = await _repository.GetAsync(id, false, ct);
        return graph is null ? null : _algorithm.Calculate(graph, source, sink, ct);
    }
}