namespace FlowCity.Domain.Graph;

public class GraphEdge
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Source { get; set; } = "";
    public string Target { get; set; } = "";
    public int Capacity { get; set; }
    public long Flow { get; set; }
}
