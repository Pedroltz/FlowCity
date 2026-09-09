using System.Text.Json;
using FlowCity.Application;
using FlowCity.Domain;
using FlowCity.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<FordFulkerson>();
builder.Services.AddDbContext<FlowCityDbContext>(options => options.UseSqlite(
    builder.Configuration.GetConnectionString("FlowCity") ?? "Data Source=flowcity.db",
    sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
var app = builder.Build();
app.Use(async (context, next) =>
{
    try { await next(context); }
    catch (ArgumentException ex)
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsJsonAsync(new { title = "Dados inválidos", detail = ex.Message, status = 400 });
    }
});
app.UseSwagger(); app.UseSwaggerUI(); app.MapControllers();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FlowCityDbContext>();
    // EnsureCreated é intencional: banco de demonstração, sem cadeia de migrações.
    var created = await db.Database.EnsureCreatedAsync();
    if (created)
    {
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "datasets"), "*.json").Order())
        {
            var graph = JsonSerializer.Deserialize<Graph>(await File.ReadAllTextAsync(file), new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            GraphValidator.Validate(graph); db.Graphs.Add(graph);
        }
        await db.SaveChangesAsync();
    }
}
app.Run();
public partial class Program { }
