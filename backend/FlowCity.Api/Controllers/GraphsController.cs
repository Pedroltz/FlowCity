using FlowCity.Application;
using FlowCity.Domain;
using FlowCity.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace FlowCity.Api.Controllers;

public sealed record GraphRequest(string Name, string? Description, List<GraphNode> Nodes, List<GraphEdge> Edges)
{
    public Graph ToGraph(Guid id) => new() { Id = id, Name = Name, Description = Description ?? "", Nodes = Nodes, Edges = Edges };
}
public sealed record MaxFlowRequest(string Source, string Sink);

[ApiController, Route("api/graphs")]
public class GraphsController(FlowCityDbContext db, FordFulkerson algorithm) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await db.Graphs.AsNoTracking()
        .Select(g => new { g.Id, g.Name, g.Description, NodeCount = g.Nodes.Count, EdgeCount = g.Edges.Count }).ToListAsync(ct));
    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var graph = await db.Graphs.AsNoTracking().SingleOrDefaultAsync(g => g.Id == id, ct);
        return graph is null ? NotFound() : Ok(graph);
    }
    [HttpPost] public async Task<IActionResult> Create(GraphRequest request, CancellationToken ct)
    {
        var graph = request.ToGraph(Guid.NewGuid()); GraphValidator.Validate(graph);
        graph.Edges.ForEach(e => e.Flow = 0); db.Graphs.Add(graph); await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = graph.Id }, graph);
    }
    [HttpPut("{id:guid}")] public async Task<IActionResult> Update(Guid id, GraphRequest request, CancellationToken ct)
    {
        var incoming = request.ToGraph(id); GraphValidator.Validate(incoming);
        var graph = await db.Graphs.SingleOrDefaultAsync(g => g.Id == id, ct); if (graph is null) return NotFound();
        graph.Name = incoming.Name; graph.Description = incoming.Description;
        // Atualizar entidades de mesma chave evita conflitos no tracking do EF.
        graph.Nodes.RemoveAll(n => !incoming.Nodes.Any(x => x.Id == n.Id));
        foreach (var n in incoming.Nodes)
        {
            var current = graph.Nodes.SingleOrDefault(x => x.Id == n.Id);
            if (current is null) graph.Nodes.Add(n); else { current.Name = n.Name; current.X = n.X; current.Y = n.Y; }
        }
        graph.Edges.RemoveAll(e => !incoming.Edges.Any(x => x.Id == e.Id));
        foreach (var e in incoming.Edges)
        {
            e.Flow = 0; var current = graph.Edges.SingleOrDefault(x => x.Id == e.Id);
            if (current is null) graph.Edges.Add(e); else { current.Source = e.Source; current.Target = e.Target; current.Capacity = e.Capacity; current.Flow = 0; }
        }
        await db.SaveChangesAsync(ct); return Ok(graph);
    }
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var graph = await db.Graphs.SingleOrDefaultAsync(g => g.Id == id, ct); if (graph is null) return NotFound();
        db.Graphs.Remove(graph); await db.SaveChangesAsync(ct); return NoContent();
    }
    [HttpPost("{id:guid}/max-flow")] public async Task<IActionResult> Calculate(Guid id, MaxFlowRequest request, CancellationToken ct)
    {
        var graph = await db.Graphs.AsNoTracking().SingleOrDefaultAsync(g => g.Id == id, ct);
        return graph is null ? NotFound() : Ok(algorithm.Calculate(graph, request.Source, request.Sink, ct));
    }
}
