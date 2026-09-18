using Microsoft.AspNetCore.SignalR;

namespace TicTacToe.Hubs;

public class GameHub : Hub
{
    private readonly GameManager _gameManager;

    public GameHub(GameManager gameManager)
    {
        _gameManager = gameManager;
    }

    public override async Task OnConnectedAsync()
    {
        var (session, isNewGame, symbol) = _gameManager.JoinOrCreate(Context.ConnectionId);

        await Clients.Caller.SendAsync("Assigned", symbol);

        if (isNewGame)
        {
            await Clients.Caller.SendAsync("Waiting");
        }
        else
        {
            await Clients.Client(session.PlayerXConnectionId).SendAsync("GameStart", "X");
            await Clients.Client(session.PlayerOConnectionId).SendAsync("GameStart", "X");
        }

        await base.OnConnectedAsync();
    }

    public async Task MakeMove(int cellIndex)
    {
        var session = _gameManager.GetSession(Context.ConnectionId);
        if (session is null || session.IsOver) return;
        if (cellIndex < 0 || cellIndex > 8) return;

        var symbol = Context.ConnectionId == session.PlayerXConnectionId ? "X" : "O";
        if (symbol != session.CurrentTurn) return;
        if (!string.IsNullOrEmpty(session.Board[cellIndex])) return;

        session.Board[cellIndex] = symbol;

        var (winner, winningLine) = _gameManager.CheckWinner(session.Board);
        session.CurrentTurn = session.CurrentTurn == "X" ? "O" : "X";

        await Clients.Client(session.PlayerXConnectionId).SendAsync("MoveMade", cellIndex, symbol, session.CurrentTurn);
        await Clients.Client(session.PlayerOConnectionId).SendAsync("MoveMade", cellIndex, symbol, session.CurrentTurn);

        if (winner is not null)
        {
            session.IsOver = true;
            await Clients.Client(session.PlayerXConnectionId).SendAsync("GameOver", winner, winningLine);
            await Clients.Client(session.PlayerOConnectionId).SendAsync("GameOver", winner, winningLine);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var session = _gameManager.GetSession(Context.ConnectionId);
        if (session is not null && !session.IsOver)
        {
            var opponentId = Context.ConnectionId == session.PlayerXConnectionId
                ? session.PlayerOConnectionId
                : session.PlayerXConnectionId;

            if (!string.IsNullOrEmpty(opponentId))
                await Clients.Client(opponentId).SendAsync("OpponentLeft");
        }

        _gameManager.RemoveConnection(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
