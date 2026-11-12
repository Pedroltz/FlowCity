using FlowCity.Api.Configuration;
using FlowCity.Api.Initialization;
using FluentValidation;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddFlowCity(builder.Configuration);
var app = builder.Build();
app.Use(async (context, next) =>
{
    try { await next(context); }
    catch (ValidationException ex)
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsJsonAsync(new
        {
            title = "Dados inválidos",
            detail = string.Join(" ", ex.Errors.Select(error => error.ErrorMessage)),
            status = 400
        });
    }
    catch (ArgumentException ex)
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsJsonAsync(new { title = "Dados inválidos", detail = ex.Message, status = 400 });
    }
});
app.UseSwagger(); app.UseSwaggerUI(); app.MapControllers();
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
}
app.Run();
public partial class Program { }
