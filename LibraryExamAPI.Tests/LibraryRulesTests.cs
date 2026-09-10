using LibraryExamAPI.Services;

namespace LibraryExamAPI.Tests;

public class LibraryRulesTests
{
    [Fact]
    public void CalculateFine_ShouldReturnZero_WhenReturnedBeforeDueDate()
    {
        var fine = LibraryRules.CalculateFine(new DateTime(2026, 1, 10), new DateTime(2026, 1, 15), 25m);

        Assert.Equal(0m, fine);
    }

    [Fact]
    public void CalculateFine_ShouldReturnOverdueFine_WhenReturnedAfterDueDate()
    {
        var fine = LibraryRules.CalculateFine(new DateTime(2026, 1, 18), new DateTime(2026, 1, 15), 25m);

        Assert.Equal(75m, fine);
    }

    [Fact]
    public void GenerateSeatPlan_ShouldAssignSeatsWithinCapacity()
    {
        var seats = LibraryRules.GenerateSeatPlan(20, 10);

        Assert.Equal(20, seats.Count);
        Assert.All(seats, seat => Assert.InRange(seat.SeatNo, 1, 10));
        Assert.Equal(2, seats.GroupBy(s => s.BenchNo).Count());
    }
}
