namespace FlowCity.Domain;

public sealed record MinimumCut(IReadOnlyList<string> Reachable, IReadOnlyList<FlowEdge> Edges, long Capacity);
public sealed record ResilienceResult(
    MaxFlowResult Baseline,
    MaxFlowResult Scenario,
    MinimumCut BaselineCut,
    MinimumCut ScenarioCut,
    long LostCapacity,
    double? LossPercent);
