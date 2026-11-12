using FlowCity.Domain.Graph;
using FluentValidation;

namespace FlowCity.Application;

public sealed class GraphValidator : AbstractValidator<Graph>
{
    public GraphValidator()
    {
        ClassLevelCascadeMode = CascadeMode.Stop;
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(graph => graph.Name).NotEmpty().WithMessage("Informe um nome de rede.")
            .MaximumLength(200).WithMessage("O nome da rede deve ter até 200 caracteres.");
        RuleFor(graph => graph.Description).NotNull().WithMessage("Informe uma descrição, mesmo que vazia.")
            .MaximumLength(5000).WithMessage("A descrição deve ter até 5000 caracteres.");
        RuleFor(graph => graph.Nodes).NotNull().WithMessage("Informe a lista de vértices.")
            .Must(nodes => nodes.Count <= 500).WithMessage("Informe até 500 vértices.");
        RuleFor(graph => graph.Edges).NotNull().WithMessage("Informe a lista de arestas.")
            .Must(edges => edges.Count <= 5000).WithMessage("Informe até 5000 arestas.");
        RuleForEach(graph => graph.Nodes).NotNull().WithMessage("O vértice não pode ser nulo.")
            .ChildRules(node =>
            {
                node.RuleFor(value => value.Id).NotEmpty().WithMessage("Informe o ID do vértice.")
                    .MaximumLength(100).WithMessage("O ID do vértice deve ter até 100 caracteres.");
                node.RuleFor(value => value.Name).NotEmpty().WithMessage("Informe o nome do vértice.")
                    .MaximumLength(200).WithMessage("O nome do vértice deve ter até 200 caracteres.");
                node.RuleFor(value => value.X).Must(double.IsFinite).WithMessage("A coordenada X deve ser finita.");
                node.RuleFor(value => value.Y).Must(double.IsFinite).WithMessage("A coordenada Y deve ser finita.");
            });
        RuleFor(graph => graph.Nodes)
            .Must(nodes => nodes.Select(node => node.Id).Distinct(StringComparer.Ordinal).Count() == nodes.Count)
            .WithMessage("Vértices devem ter IDs únicos.");
        RuleForEach(graph => graph.Edges).NotNull().WithMessage("A aresta não pode ser nula.")
            .ChildRules(edge =>
            {
                edge.RuleFor(value => value.Id).NotEmpty().WithMessage("Informe o ID da aresta.")
                    .MaximumLength(100).WithMessage("O ID da aresta deve ter até 100 caracteres.");
                edge.RuleFor(value => value.Source).NotNull().WithMessage("Informe a origem da aresta.");
                edge.RuleFor(value => value.Target).NotNull().WithMessage("Informe o destino da aresta.");
                edge.RuleFor(value => value.Capacity).GreaterThanOrEqualTo(0)
                    .WithMessage("A capacidade deve ser inteira e não negativa.");
            });
        RuleFor(graph => graph.Edges)
            .Must(edges => edges.Select(edge => edge.Id).Distinct(StringComparer.Ordinal).Count() == edges.Count)
            .WithMessage("Arestas devem ter IDs únicos.");
        RuleFor(graph => graph).Must(graph =>
        {
            var ids = graph.Nodes.Select(node => node.Id).ToHashSet(StringComparer.Ordinal);
            return graph.Edges.All(edge => ids.Contains(edge.Source) && ids.Contains(edge.Target));
        }).WithMessage("Os extremos das arestas devem existir na rede.");
    }
}