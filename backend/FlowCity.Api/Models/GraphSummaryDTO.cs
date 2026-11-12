namespace FlowCity.Api.Models;

public sealed class GraphSummaryDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int NodeCount { get; set; }
    public int EdgeCount { get; set; }
}
