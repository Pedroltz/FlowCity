namespace FlowCity.Domain;

public record FlowEdge(string Id, string Source, string Target, int Capacity, long Flow, long ResidualCapacity);
public record ResidualEdge(string Id, string OriginalEdgeId, string Source, string Target, long ResidualCapacity, bool IsReverse);
public record PathSegment(string EdgeId, string Source, string Target, long ResidualCapacity, bool IsReverse);
public record AugmentingPath(int Iteration, IReadOnlyList<string> Nodes, IReadOnlyList<PathSegment> Edges, long Bottleneck, long AddedFlow);
public record MaxFlowResult(long MaxFlow, double ExecutionTimeMs, int Iterations,
    IReadOnlyList<AugmentingPath> AugmentingPaths, IReadOnlyList<FlowEdge> Edges,
    IReadOnlyList<ResidualEdge> ResidualNetwork);
