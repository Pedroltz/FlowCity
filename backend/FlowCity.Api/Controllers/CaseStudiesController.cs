using FlowCity.Application.Services;
using FlowCity.Domain;
using Microsoft.AspNetCore.Mvc;

namespace FlowCity.Api.Controllers;

[ApiController, Route("api/case-studies")]
public sealed class CaseStudiesController(ResilienceService service) : ControllerBase
{
    [HttpGet]
    public IActionResult List() => Ok(service.List());
    [HttpGet("{id}")]
    public IActionResult Get(string id) => service.Get(id) is { } study ? Ok(study) : NotFound();
    [HttpPost("{id}/resilience")]
    [ProducesResponseType(typeof(ResilienceResult), StatusCodes.Status200OK)]
    public IActionResult Analyze(string id, ResilienceService.ResilienceRequest request, CancellationToken ct)
    {
        var result = service.Analyze(id, request, ct);
        return result is null ? NotFound() : Ok(result);
    }
}
