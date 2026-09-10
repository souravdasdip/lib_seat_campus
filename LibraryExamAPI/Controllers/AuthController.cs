using System.ComponentModel.DataAnnotations;
using LibraryExamAPI.Data;
using LibraryExamAPI.Models;
using LibraryExamAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LibraryExamAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private static readonly string[] AllowedRoles =
    [
        "Student",
        "Librarian",
        "Exam Coordinator",
        "Admin"
    ];

    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwtTokenService;

    public AuthController(AppDbContext db, JwtTokenService jwtTokenService)
    {
        _db = db;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        if (await _db.Students.AnyAsync(s => s.RollNo == request.RollNo || s.Contact == request.Email))
        {
            return BadRequest(new { message = "A student with this roll number or email already exists." });
        }

        var student = new Student
        {
            Name = request.Name,
            RollNo = request.RollNo,
            Dept = request.Dept,
            Semester = request.Semester,
            Contact = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            IsVerified = false
        };

        _db.Students.Add(student);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Registration successful.", studentId = student.StudentId });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Contact == request.Email);

        if (student == null || string.IsNullOrWhiteSpace(student.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.Password, student.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var token = _jwtTokenService.GenerateToken(student.Contact, student.Role);

        return Ok(new
        {
            token,
            user = new
            {
                student.StudentId,
                student.Name,
                student.RollNo,
                student.Role,
                student.Contact
            }
        });
    }

    [HttpPost("admin/create-user")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateUserByAdmin([FromBody] CreateUserRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        if (!AllowedRoles.Contains(request.Role))
        {
            return BadRequest(new { message = "Role must be one of: Student, Librarian, Exam Coordinator, Admin." });
        }

        if (await _db.Students.AnyAsync(s => s.RollNo == request.RollNo || s.Contact == request.Email))
        {
            return BadRequest(new { message = "A user with this roll number or email already exists." });
        }

        var user = new Student
        {
            Name = request.Name,
            RollNo = request.RollNo,
            Dept = request.Dept,
            Semester = request.Semester,
            Contact = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            IsVerified = request.Role == "Admin"
        };

        _db.Students.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"{request.Role} account created successfully.", userId = user.StudentId });
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        return Ok(new { message = "Logout successful." });
    }

    [HttpPost("reset-password")]
    [Authorize]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized();
        }

        var student = await _db.Students.FirstOrDefaultAsync(s => s.Contact == email);
        if (student == null)
        {
            return NotFound();
        }

        student.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password reset successful." });
    }

    [HttpGet("check-availability")]
    public async Task<IActionResult> CheckAvailability([FromQuery] string email = "", [FromQuery] string username = "")
    {
        var emailTaken = !string.IsNullOrWhiteSpace(email) && await _db.Students.AnyAsync(s => s.Contact == email);
        var usernameTaken = !string.IsNullOrWhiteSpace(username) && await _db.Students.AnyAsync(s => s.RollNo == username);

        return Ok(new { emailTaken, usernameTaken });
    }
}

public class RegisterRequest
{
    [Required, MinLength(3)]
    public string Name { get; set; } = string.Empty;

    [Required, MinLength(3)]
    public string RollNo { get; set; } = string.Empty;

    [Required]
    public string Dept { get; set; } = string.Empty;

    [Required]
    public int Semester { get; set; }

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = "Student";
}

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class CreateUserRequest
{
    [Required, MinLength(3)]
    public string Name { get; set; } = string.Empty;

    [Required, MinLength(3)]
    public string RollNo { get; set; } = string.Empty;

    [Required]
    public string Dept { get; set; } = string.Empty;

    [Required]
    public int Semester { get; set; }

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = "Student";
}
