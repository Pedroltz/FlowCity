namespace FlowCity.Domain.FordFulkerson;

public sealed class Arc(int from, int to, int edgeIndex, bool reverse, long residual)
{
    public int From { get; } = from;
    public int To { get; } = to;
    public int EdgeIndex { get; } = edgeIndex;
    public bool Reverse { get; } = reverse;
    public long Residual { get; set; } = residual;
    public Arc Pair { get; set; } = null!;
}