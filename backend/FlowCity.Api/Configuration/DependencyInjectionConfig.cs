using FlowCity.Api.Initialization;
using FlowCity.Api.Mappings;
using FlowCity.Application;
using FlowCity.Application.Mappings;
using FlowCity.Application.Services;
using FlowCity.Domain.Graph;
using FlowCity.Domain.Interfaces;
using FlowCity.Infrastructure;
using FlowCity.Infrastructure.Repositories;
using FluentValidation;
using Mapster;
using MapsterMapper;
using Microsoft.EntityFrameworkCore;

namespace FlowCity.Api.Configuration;

public static class DependencyInjectionConfig
{
    public static IServiceCollection AddFlowCity(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IRegister, GraphMappingRegister>();
        services.AddSingleton<IRegister, GraphMappingConfig>();
        services.AddSingleton(provider =>
        {
            var config = new TypeAdapterConfig();
            foreach (var register in provider.GetServices<IRegister>()) register.Register(config);
            config.Compile();
            return config;
        });
        services.AddScoped<IMapper, Mapper>();
        services.AddScoped<IValidator<Graph>, GraphValidator>();
        services.AddScoped<IMaxFlowAlgorithm, FordFulkerson>();
        services.AddScoped<IGraphRepository, GraphRepository>();
        services.AddScoped<IGraphService, GraphService>();
        services.AddScoped<ResilienceService>();
        services.AddScoped<DatabaseInitializer>();
        services.AddDbContext<FlowCityDbContext>(options => options.UseSqlite(
            configuration.GetConnectionString("FlowCity") ?? "Data Source=flowcity.db",
            sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
        return services;
    }
}
