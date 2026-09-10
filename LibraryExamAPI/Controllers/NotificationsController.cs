using System.Security.Claims;
using LibraryExamAPI.Data;
using LibraryExamAPI.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LibraryExamAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public NotificationsController(AppDbContext db, IHubContext<NotificationHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpGet("summary")]
    [Authorize]
    public async Task<IActionResult> GetSummary()
    {
        var totalStudents = await _db.Students.CountAsync();
        var totalBooks = await _db.Books.CountAsync();
        var totalExams = await _db.Exams.CountAsync();
        var activeIssues = await _db.IssueRecords.CountAsync(i => i.ReturnDate == null);
        var overdueCount = await _db.IssueRecords.CountAsync(i => i.ReturnDate == null && i.DueDate < DateTime.UtcNow);

        var notifications = new[]
        {
            new { type = "info", message = $"{totalStudents} registered users are active in the system." },
            new { type = "warning", message = activeIssues > 0 ? $"{activeIssues} books are currently issued." : "No active book issues at the moment." },
            new { type = "danger", message = overdueCount > 0 ? $"{overdueCount} books are overdue and need attention." : "No overdue items in the library today." },
            new { type = "success", message = $"{totalExams} exam schedules are currently available for review." }
        };

        return Ok(new
        {
            totalStudents,
            totalBooks,
            totalExams,
            activeIssues,
            overdueCount,
            notifications
        });
    }

    [HttpPost("broadcast")]
    [Authorize]
    public async Task<IActionResult> Broadcast([FromBody] BroadcastRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { message = "A notification message is required." });
        }

        var actorRole = User.FindFirstValue(ClaimTypes.Role) ?? "System";
        await _hub.Clients.All.SendAsync("ReceiveNotification", new
        {
            message = request.Message,
            createdAt = DateTime.UtcNow,
            actorRole
        });

        return Ok(new { message = "Notification sent." });
    }
}

public class BroadcastRequest
{
    public string Message { get; set; } = string.Empty;
}
