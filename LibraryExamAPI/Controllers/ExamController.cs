using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using LibraryExamAPI.Data;
using LibraryExamAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LibraryExamAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExamController : ControllerBase
{
    private readonly AppDbContext _db;

    public ExamController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("rooms")]
    [Authorize(Roles = "Admin,Exam Coordinator,Librarian")]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _db.Rooms
            .OrderBy(r => r.RoomNo)
            .Select(r => new
            {
                roomId = r.RoomId,
                roomNo = r.RoomNo,
                capacity = r.Capacity,
                benchLayout = r.BenchLayout,
                occupiedSeats = r.SeatAllocations.Count()
            })
            .ToListAsync();

        return Ok(rooms);
    }

    [HttpPost("rooms")]
    [Authorize(Roles = "Admin,Exam Coordinator")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var room = new Room
        {
            RoomNo = request.RoomNo.Trim(),
            Capacity = request.Capacity,
            BenchLayout = request.BenchLayout.Trim()
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Room created successfully.", roomId = room.RoomId });
    }

    [HttpGet("invigilators")]
    [Authorize(Roles = "Admin,Exam Coordinator,Librarian")]
    public async Task<IActionResult> GetInvigilators()
    {
        var invigilators = await _db.Invigilators
            .OrderBy(i => i.Name)
            .Select(i => new
            {
                staffId = i.StaffId,
                name = i.Name,
                dept = i.Dept,
                assignedCount = i.SeatAllocations.Count()
            })
            .ToListAsync();

        return Ok(invigilators);
    }

    [HttpPost("invigilators")]
    [Authorize(Roles = "Admin,Exam Coordinator")]
    public async Task<IActionResult> CreateInvigilator([FromBody] CreateInvigilatorRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var invigilator = new Invigilator
        {
            Name = request.Name.Trim(),
            Dept = request.Dept.Trim()
        };

        _db.Invigilators.Add(invigilator);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Invigilator added successfully.", staffId = invigilator.StaffId });
    }

    [HttpGet("exams")]
    [Authorize(Roles = "Admin,Exam Coordinator,Librarian")]
    public async Task<IActionResult> GetExams()
    {
        var exams = await _db.Exams
            .Include(e => e.SeatAllocations)
            .OrderBy(e => e.ExamDate)
            .Select(e => new
            {
                examId = e.ExamId,
                course = e.Course,
                semester = e.Semester,
                examDate = e.ExamDate,
                timeSlot = e.TimeSlot,
                seatCount = e.SeatAllocations.Count
            })
            .ToListAsync();

        return Ok(exams);
    }

    [HttpPost("exams")]
    [Authorize(Roles = "Admin,Exam Coordinator")]
    public async Task<IActionResult> CreateExam([FromBody] CreateExamRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var exam = new Exam
        {
            Course = request.Course.Trim(),
            Semester = request.Semester,
            ExamDate = request.ExamDate,
            TimeSlot = request.TimeSlot.Trim()
        };

        _db.Exams.Add(exam);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Exam created successfully.", examId = exam.ExamId });
    }

    [HttpGet("allocations")]
    [Authorize(Roles = "Admin,Exam Coordinator,Librarian")]
    public async Task<IActionResult> GetAllocations()
    {
        var allocations = await _db.SeatAllocations
            .Include(sa => sa.Exam)
            .Include(sa => sa.Room)
            .Include(sa => sa.Student)
            .OrderBy(sa => sa.ExamId)
            .ThenBy(sa => sa.BenchNo)
            .ThenBy(sa => sa.SeatNo)
            .Select(sa => new
            {
                seatId = sa.SeatId,
                examId = sa.ExamId,
                course = sa.Exam.Course,
                roomNo = sa.Room.RoomNo,
                studentId = sa.StudentId,
                studentName = sa.Student.Name,
                rollNo = sa.Student.RollNo,
                benchNo = sa.BenchNo,
                seatNo = sa.SeatNo,
                invigilatorId = sa.InvigilatorId
            })
            .ToListAsync();

        return Ok(allocations);
    }

    [HttpGet("my-allocations")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyAllocations()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "User email is not available in the token." });
        }

        var student = await _db.Students.FirstOrDefaultAsync(s => s.Contact == email);
        if (student == null)
        {
            return NotFound(new { message = "Student profile not found." });
        }

        var allocations = await _db.SeatAllocations
            .Include(sa => sa.Exam)
            .Include(sa => sa.Room)
            .Where(sa => sa.StudentId == student.StudentId)
            .OrderBy(sa => sa.Exam.ExamDate)
            .Select(sa => new
            {
                seatId = sa.SeatId,
                examId = sa.ExamId,
                course = sa.Exam.Course,
                semester = sa.Exam.Semester,
                examDate = sa.Exam.ExamDate,
                timeSlot = sa.Exam.TimeSlot,
                roomNo = sa.Room.RoomNo,
                benchNo = sa.BenchNo,
                seatNo = sa.SeatNo
            })
            .ToListAsync();

        return Ok(allocations);
    }

    [HttpPost("allocate")]
    [Authorize(Roles = "Admin,Exam Coordinator")]
    public async Task<IActionResult> AllocateSeats([FromBody] AllocateSeatsRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var exam = await _db.Exams.FirstOrDefaultAsync(e => e.ExamId == request.ExamId);
        if (exam == null)
        {
            return NotFound(new { message = "Exam not found." });
        }

        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomId == request.RoomId);
        if (room == null)
        {
            return NotFound(new { message = "Room not found." });
        }

        var studentQuery = _db.Students.AsQueryable();

        if (request.StudentIds is { Count: > 0 })
        {
            studentQuery = studentQuery.Where(s => request.StudentIds.Contains(s.StudentId));
        }
        else if (!string.IsNullOrWhiteSpace(request.Dept))
        {
            studentQuery = studentQuery.Where(s => s.Dept == request.Dept);
        }
        else
        {
            studentQuery = studentQuery.Where(s => s.Semester == request.Semester || request.Semester <= 0);
        }

        var students = await studentQuery
            .OrderBy(s => s.Name)
            .Select(s => s.StudentId)
            .ToListAsync();

        if (students.Count == 0)
        {
            return BadRequest(new { message = "No eligible students found for allocation." });
        }

        var limit = Math.Min(room.Capacity, students.Count);
        var selectedIds = students.Take(limit).ToList();

        var existing = _db.SeatAllocations.Where(sa => sa.ExamId == request.ExamId);
        _db.SeatAllocations.RemoveRange(existing);

        var allocations = new List<SeatAllocation>();
        for (var i = 0; i < selectedIds.Count; i++)
        {
            var studentId = selectedIds[i];
            var benchNo = (i / 10) + 1;
            var seatNo = (i % 10) + 1;

            allocations.Add(new SeatAllocation
            {
                ExamId = request.ExamId,
                RoomId = request.RoomId,
                StudentId = studentId,
                BenchNo = benchNo,
                SeatNo = seatNo,
                InvigilatorId = request.InvigilatorId
            });
        }

        _db.SeatAllocations.AddRange(allocations);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Seat allocation generated successfully.",
            allocatedCount = allocations.Count,
            roomNo = room.RoomNo,
            examId = request.ExamId
        });
    }
}

public class CreateRoomRequest
{
    [Required, MinLength(2)]
    public string RoomNo { get; set; } = string.Empty;

    [Range(1, 500)]
    public int Capacity { get; set; } = 30;

    [Required, MinLength(2)]
    public string BenchLayout { get; set; } = "10-per-bench";
}

public class CreateInvigilatorRequest
{
    [Required, MinLength(2)]
    public string Name { get; set; } = string.Empty;

    [Required, MinLength(2)]
    public string Dept { get; set; } = string.Empty;
}

public class CreateExamRequest
{
    [Required, MinLength(2)]
    public string Course { get; set; } = string.Empty;

    [Range(1, 12)]
    public int Semester { get; set; } = 1;

    public DateTime ExamDate { get; set; } = DateTime.UtcNow.AddDays(7);

    [Required, MinLength(2)]
    public string TimeSlot { get; set; } = "09:00 AM - 11:00 AM";
}

public class AllocateSeatsRequest
{
    [Required]
    public int ExamId { get; set; }

    [Required]
    public int RoomId { get; set; }

    public int Semester { get; set; }

    public string? Dept { get; set; }

    public List<int>? StudentIds { get; set; }

    public int? InvigilatorId { get; set; }
}
