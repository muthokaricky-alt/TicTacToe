const connection = new signalR.HubConnectionBuilder()
    .withUrl("/gamehub")
    .build();

const statusPill = document.getElementById("status-pill");
const statusText = document.getElementById("status-text");
const symbolBadge = document.getElementById("symbol-badge");
const symbolLabel = document.getElementById("symbol-label");
const cells = document.querySelectorAll(".cell");
const board = document.getElementById("board");
const winLine = document.getElementById("win-line");

const modalOverlay = document.getElementById("modal-overlay");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalButton = document.getElementById("modal-button");

let mySymbol = null;
let myTurn = false;
let gameOver = false;

function setStatus(text, mode) {
    statusText.textContent = text;
    statusPill.classList.remove("skeleton", "your-turn", "waiting");
    if (mode) statusPill.classList.add(mode);
}

function refreshIcons() {
    if (window.lucide) lucide.createIcons();
}

function showModal(kind, title, message) {
    modalIcon.className = `modal-icon ${kind}`;
    const iconName = kind === "win" ? "trophy" : kind === "lose" ? "frown" : "handshake";
    modalIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    refreshIcons();
    modalOverlay.classList.add("visible");
}

modalButton.addEventListener("click", () => window.location.reload());

function drawWinningLine(line) {
    const boardRect = board.getBoundingClientRect();
    const startRect = cells[line[0]].getBoundingClientRect();
    const endRect = cells[line[2]].getBoundingClientRect();

    const startX = startRect.left + startRect.width / 2 - boardRect.left;
    const startY = startRect.top + startRect.height / 2 - boardRect.top;
    const endX = endRect.left + endRect.width / 2 - boardRect.left;
    const endY = endRect.top + endRect.height / 2 - boardRect.top;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy) + 20; // small overshoot past the outer cells
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    winLine.style.transition = "none";
    winLine.style.left = `${startX - 10}px`;
    winLine.style.top = `${startY}px`;
    winLine.style.width = `${length}px`;
    winLine.style.transform = `rotate(${angle}deg) scaleX(0)`;
    winLine.style.opacity = "0";

    // Force reflow so the transition below actually animates.
    void winLine.offsetWidth;

    winLine.style.transition = "transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease";
    winLine.style.transform = `rotate(${angle}deg) scaleX(1)`;
    winLine.style.opacity = "1";
}

connection.on("Assigned", (symbol) => {
    mySymbol = symbol;
    symbolLabel.textContent = `You are ${symbol}`;
    symbolBadge.classList.remove("hidden");
});

connection.on("Waiting", () => {
    setStatus("Waiting for an opponent…", "waiting");
});

connection.on("GameStart", (startingSymbol) => {
    gameOver = false;
    myTurn = mySymbol === startingSymbol;
    setStatus(myTurn ? "Your turn" : "Opponent's turn", myTurn ? "your-turn" : null);
});

connection.on("MoveMade", (cellIndex, symbol, nextTurn) => {
    const cell = cells[cellIndex];
    cell.textContent = symbol;
    cell.classList.add(symbol === "X" ? "x" : "o", "filled", "pop");

    myTurn = mySymbol === nextTurn;
    if (!gameOver) {
        setStatus(myTurn ? "Your turn" : "Opponent's turn", myTurn ? "your-turn" : null);
    }
});

connection.on("GameOver", (result, winningLine) => {
    gameOver = true;

    if (winningLine) {
        drawWinningLine(winningLine);
    }

    const reveal = () => {
        if (result === "draw") {
            setStatus("It's a draw", null);
            showModal("draw", "It's a draw", "Nobody wins this round.");
        } else if (result === mySymbol) {
            setStatus("You win!", null);
            showModal("win", "Well done", "You win!");
        } else {
            setStatus("You lost", null);
            showModal("lose", "Sorry", "You lost.");
        }
    };

    // Let the winning line animate in before the modal appears on top of it.
    setTimeout(reveal, winningLine ? 500 : 0);
});

connection.on("OpponentLeft", () => {
    gameOver = true;
    setStatus("Opponent disconnected", null);
    showModal("draw", "Opponent left", "Refresh to find a new game.");
});

cells.forEach((cell) => {
    cell.addEventListener("click", () => {
        if (gameOver || !myTurn || cell.textContent !== "") return;
        const index = parseInt(cell.dataset.index, 10);
        connection.invoke("MakeMove", index);
    });
});

connection.start().catch((err) => {
    setStatus("Connection failed", null);
    console.error(err);
});

refreshIcons();
