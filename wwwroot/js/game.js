const connection = new signalR.HubConnectionBuilder()
    .withUrl("/gamehub")
    .build();

const statusEl = document.getElementById("status");
const symbolLabel = document.getElementById("symbol-label");
const cells = document.querySelectorAll(".cell");

let mySymbol = null;
let myTurn = false;
let gameOver = false;

connection.on("Assigned", (symbol) => {
    mySymbol = symbol;
    symbolLabel.textContent = `You are: ${symbol}`;
});

connection.on("Waiting", () => {
    statusEl.textContent = "Waiting for an opponent...";
});

connection.on("GameStart", (startingSymbol) => {
    statusEl.textContent = `Game started! ${startingSymbol}'s turn.`;
    myTurn = mySymbol === startingSymbol;
    gameOver = false;
});

connection.on("MoveMade", (cellIndex, symbol, nextTurn) => {
    const cell = cells[cellIndex];
    cell.textContent = symbol;
    cell.classList.add(symbol === "X" ? "x" : "o");
    myTurn = mySymbol === nextTurn;
    if (!gameOver) {
        statusEl.textContent = myTurn ? "Your turn" : "Opponent's turn";
    }
});

connection.on("GameOver", (result) => {
    gameOver = true;
    if (result === "draw") {
        statusEl.textContent = "It's a draw!";
    } else if (result === mySymbol) {
        statusEl.textContent = "You win!";
    } else {
        statusEl.textContent = "You lose.";
    }
});

connection.on("OpponentLeft", () => {
    gameOver = true;
    statusEl.textContent = "Opponent disconnected. Refresh to find a new game.";
});

cells.forEach((cell) => {
    cell.addEventListener("click", () => {
        if (gameOver || !myTurn || cell.textContent !== "") return;
        const index = parseInt(cell.dataset.index, 10);
        connection.invoke("MakeMove", index);
    });
});

connection.start().catch((err) => {
    statusEl.textContent = "Connection failed.";
    console.error(err);
});
