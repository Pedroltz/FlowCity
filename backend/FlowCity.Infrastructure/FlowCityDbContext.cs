using FlowCity.Domain;
using Microsoft.EntityFrameworkCore;
namespace FlowCity.Infrastructure;

public sealed class FlowCityDbContext(DbContextOptions<FlowCityDbContext> options) : DbContext(options)
{
    public DbSet<Graph> Graphs => Set<Graph>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var graph = modelBuilder.Entity<Graph>();
        graph.HasKey(g => g.Id);
        graph.OwnsMany(g => g.Nodes, n => { n.WithOwner().HasForeignKey("GraphId"); n.HasKey("GraphId", nameof(GraphNode.Id)); n.Property(x => x.Id).ValueGeneratedNever(); });
        graph.OwnsMany(g => g.Edges, e => { e.WithOwner().HasForeignKey("GraphId"); e.HasKey("GraphId", nameof(GraphEdge.Id)); e.Property(x => x.Id).ValueGeneratedNever(); });
    }
}
