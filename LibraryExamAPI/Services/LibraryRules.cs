namespace LibraryExamAPI.Services;

public static class LibraryRules
{
    public static decimal CalculateFine(DateTime returnDate, DateTime dueDate, decimal perDayFine)
    {
        if (returnDate <= dueDate)
        {
            return 0m;
        }

        var overdueDays = (returnDate.Date - dueDate.Date).Days;
        return overdueDays * perDayFine;
    }

    public static List<SeatPosition> GenerateSeatPlan(int totalStudents, int seatsPerBench)
    {
        var seats = new List<SeatPosition>();
        var benchCount = (int)Math.Ceiling(totalStudents / (double)seatsPerBench);

        for (var index = 0; index < totalStudents; index++)
        {
            var benchNo = (index / seatsPerBench) + 1;
            var seatNo = (index % seatsPerBench) + 1;
            seats.Add(new SeatPosition { BenchNo = benchNo, SeatNo = seatNo });
        }

        return seats;
    }
}

public class SeatPosition
{
    public int BenchNo { get; set; }
    public int SeatNo { get; set; }
}
