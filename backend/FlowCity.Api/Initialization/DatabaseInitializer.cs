using System.Text.Json;
using FlowCity.Domain.Graph;
using FlowCity.Infrastructure;
using FluentValidation;

namespace FlowCity.Api.Initialization;

public sealed class DatabaseInitializer(FlowCityDbContext db, IValidator<Graph> validator)
{
    public async Task InitializeAsync(CancellationToken ct = default)
    {
        // Seed only a newly created database; never recreate deliberately deleted graphs.
        if (!await db.Database.EnsureCreatedAsync(ct)) return;

        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "datasets"), "*.json").Order())
        {
            var graph = JsonSerializer.Deserialize<Graph>(await File.ReadAllTextAsync(file, ct),
                new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            validator.ValidateAndThrow(graph);
            db.Graphs.Add(graph);
        }
        await db.SaveChangesAsync(ct);
    }
}
