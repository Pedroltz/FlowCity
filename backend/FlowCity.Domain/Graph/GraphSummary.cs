namespace FlowCity.Domain.Graph;

public sealed class GraphSummary
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int NodeCount { get; set; }
    public int EdgeCount { get; set; }
}
