namespace FlowCity.Api.Models;

public sealed class GraphEdgeRequestDTO
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Source { get; set; } = "";
    public string Target { get; set; } = "";
    public int Capacity { get; set; }
}
