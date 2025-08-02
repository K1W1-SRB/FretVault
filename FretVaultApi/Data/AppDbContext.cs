using FretVaultApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FretVaultApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Song> Songs => Set<Song>();
    }
}