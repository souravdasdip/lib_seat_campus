using System.Text;
using LibraryExamAPI.Data;
using LibraryExamAPI.Models;
using LibraryExamAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwtKey = builder.Configuration["JwtSettings:Key"] ?? "P@ssw0rd!SuperSecretKeyForDevelopmentOnly123456";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "LibraryExamAPI",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "LibraryExamClient",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(2)
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("LibrarianOrAdmin", policy => policy.RequireRole("Admin", "Librarian"));
    options.AddPolicy("ExamCoordinatorOrAdmin", policy => policy.RequireRole("Admin", "Exam Coordinator"));
});

builder.Services.AddScoped<JwtTokenService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClientApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowClientApp");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/api/ping", () => new { status = "ok", message = "LibraryExamAPI is running." })
   .WithName("Ping");

app.MapGet("/api/health", async (AppDbContext db) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    return new { status = canConnect ? "Database connected" : "Database unavailable" };
})
.WithName("HealthCheck");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var defaultAdminEmail = builder.Configuration["DefaultAdmin:Email"] ?? "admin@library.edu";
    var defaultAdminPassword = builder.Configuration["DefaultAdmin:Password"] ?? "Admin@123";

    var adminExists = await db.Students.AnyAsync(s => s.Role == "Admin" || s.Contact == defaultAdminEmail);
    if (!adminExists)
    {
        var admin = new Student
        {
            Name = "System Administrator",
            RollNo = "ADMIN-001",
            Dept = "Administration",
            Semester = 1,
            Contact = defaultAdminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultAdminPassword),
            Role = "Admin",
            IsVerified = true
        };

        db.Students.Add(admin);
        await db.SaveChangesAsync();
    }
}

app.Run();
