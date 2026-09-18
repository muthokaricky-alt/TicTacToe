namespace TicTacToe.Hubs;

public class GameSession
{
    public string[] Board { get; } = new string[9];
    public string CurrentTurn { get; set; } = "X";
    public string PlayerXConnectionId { get; set; } = "";
    public string PlayerOConnectionId { get; set; } = "";
    public bool IsOver { get; set; } = false;
}

// Simple in-memory matchmaker: pairs the first two players who connect.
// Singleton lifetime means state lives as long as the server process runs.
public class GameManager
{
    private readonly object _lock = new();
    private string? _waitingConnectionId;
    private readonly Dictionary<string, GameSession> _sessionsByConnection = new();

    public (GameSession Session, bool IsNewGame, string Symbol) JoinOrCreate(string connectionId)
    {
        lock (_lock)
        {
            if (_waitingConnectionId is null)
            {
                _waitingConnectionId = connectionId;
                var session = new GameSession { PlayerXConnectionId = connectionId };
                _sessionsByConnection[connectionId] = session;
                return (session, true, "X");
            }

            var existingSession = _sessionsByConnection[_waitingConnectionId];
            existingSession.PlayerOConnectionId = connectionId;
            _sessionsByConnection[connectionId] = existingSession;
            _waitingConnectionId = null;
            return (existingSession, false, "O");
        }
    }

    public GameSession? GetSession(string connectionId)
    {
        lock (_lock)
        {
            return _sessionsByConnection.GetValueOrDefault(connectionId);
        }
    }

    public void RemoveConnection(string connectionId)
    {
        lock (_lock)
        {
            if (_waitingConnectionId == connectionId)
                _waitingConnectionId = null;

            _sessionsByConnection.Remove(connectionId);
        }
    }

    public string? CheckWinner(string[] board)
    {
        int[][] lines =
        {
            new[] { 0, 1, 2 }, new[] { 3, 4, 5 }, new[] { 6, 7, 8 },
            new[] { 0, 3, 6 }, new[] { 1, 4, 7 }, new[] { 2, 5, 8 },
            new[] { 0, 4, 8 }, new[] { 2, 4, 6 }
        };

        foreach (var line in lines)
        {
            var (a, b, c) = (line[0], line[1], line[2]);
            if (!string.IsNullOrEmpty(board[a]) && board[a] == board[b] && board[b] == board[c])
                return board[a];
        }

        return board.All(cell => !string.IsNullOrEmpty(cell)) ? "draw" : null;
    }
}
