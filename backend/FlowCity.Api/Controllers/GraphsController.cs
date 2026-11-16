using FlowCity.Api.Models;
using FlowCity.Domain.Graph;
using FlowCity.Domain.Interfaces;
using FlowCity.Application.Services;
using MapsterMapper;
using Microsoft.AspNetCore.Mvc;

namespace FlowCity.Api.Controllers;

[ApiController, Route("api/graphs")]
public class GraphsController : ControllerBase
{
    private readonly IMapper _mapper;

    public GraphsController(IMapper mapper)
    {
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromServices] IGraphService service, CancellationToken ct)
    {
        var summaries = await service.ListAsync(ct);
        return Ok(_mapper.Map<List<GraphSummaryDTO>>(summaries));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, [FromServices] IGraphService service, CancellationToken ct)
    {
        var graph = await service.GetAsync(id, ct);
        return graph is null ? NotFound() : Ok(graph);
    }

    [HttpPost]
    public async Task<IActionResult> Create(GraphRequestDTO request, [FromServices] IGraphService service,
        CancellationToken ct)
    {
        var graph = await service.CreateAsync(_mapper.Map<Graph>(request), ct);
        return CreatedAtAction(nameof(Get), new { id = graph.Id }, graph);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, GraphRequestDTO request, [FromServices] IGraphService service,
        CancellationToken ct)
    {
        var graph = await service.UpdateAsync(id, _mapper.Map<Graph>(request), ct);
        return graph is null ? NotFound() : Ok(graph);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromServices] IGraphService service, CancellationToken ct) =>
        await service.DeleteAsync(id, ct) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/max-flow")]
    public async Task<IActionResult> Calculate(Guid id, MaxFlowRequestDTO request, [FromServices] IGraphService service,
        CancellationToken ct)
    {
        var result = await service.CalculateAsync(id, request.Source, request.Sink, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/resilience")]
    public async Task<IActionResult> AnalyzeResilience(Guid id, ResilienceService.ResilienceRequest request,
        [FromServices] IGraphService graphs, [FromServices] ResilienceService resilience, CancellationToken ct)
    {
        var graph = await graphs.GetAsync(id, ct);
        if (graph is null) return NotFound();

        try
        {
            return Ok(resilience.Analyze(graph, request, ct));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new ProblemDetails { Title = "Não foi possível analisar a manutenção.", Detail = exception.Message });
        }
    }
}
