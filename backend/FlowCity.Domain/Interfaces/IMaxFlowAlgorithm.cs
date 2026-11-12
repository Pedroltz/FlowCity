using GraphEntity = FlowCity.Domain.Graph.Graph;

namespace FlowCity.Domain.Interfaces;

public interface IMaxFlowAlgorithm
{
    MaxFlowResult Calculate(GraphEntity graph, string source, string sink,
        CancellationToken cancellationToken = default);
}
