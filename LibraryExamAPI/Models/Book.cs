using System.ComponentModel.DataAnnotations;

namespace LibraryExamAPI.Models;

public class Book
{
    [Key]
    public int BookId { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Author { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Isbn { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Genre { get; set; } = string.Empty;

    public int CopiesAvailable { get; set; }

    public ICollection<IssueRecord> IssueRecords { get; set; } = new List<IssueRecord>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
}
