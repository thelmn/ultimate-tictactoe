import type { GameState, Mark } from "./types";

export function createEmptyBoard(): (Mark | null)[][] {
  return Array.from({ length: 9 }, () => Array<Mark | null>(9).fill(null));
}

export function createEmptyMiniWinners(): (Mark | "draw" | null)[] {
  return Array<(Mark | "draw" | null)>(9).fill(null);
}

export function initialGameState(): GameState {
  return {
    boards: createEmptyBoard(),
    miniWinners: createEmptyMiniWinners(),
    currentPlayer: "X",
    activeMiniBoard: null,
    lastMove: null,
    gameWinner: null,
  history: [],
  historyIndex: -1,
  };
}

const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkWinner(board: (Mark | "draw" | null)[]): Mark | null {
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] !== "draw" && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Mark;
    }
  }
  return null;
}

export function isBoardFull(board: (Mark | null)[]): boolean {
  return board.every((c) => c !== null);
}

export type GameSnapshot = {
  boards: (Mark | null)[][];
  miniWinners: (Mark | "draw" | null)[];
  currentPlayer: Mark;
  activeMiniBoard: number | null;
  lastMove: { miniBoardIndex: number; cellIndex: number; player: Mark } | null;
  gameWinner: Mark | null;
};

export function toSnapshot(state: GameState): GameSnapshot {
  return {
    boards: state.boards.map((b) => [...b]),
    miniWinners: [...state.miniWinners],
    currentPlayer: state.currentPlayer,
    activeMiniBoard: state.activeMiniBoard,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    gameWinner: state.gameWinner,
  };
}

export function applyMove(state: GameState, miniBoardIndex: number, cellIndex: number): GameState {
  if (state.gameWinner) return state;
  if (state.activeMiniBoard !== null && state.activeMiniBoard !== miniBoardIndex) return state;
  if (state.miniWinners[miniBoardIndex]) return state;
  if (state.boards[miniBoardIndex][cellIndex]) return state;

  const next: GameState = {
    boards: state.boards.map((b) => [...b]),
    miniWinners: [...state.miniWinners],
    currentPlayer: state.currentPlayer,
    activeMiniBoard: state.activeMiniBoard,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    gameWinner: state.gameWinner,
    history: [...state.history],
    historyIndex: state.historyIndex,
  };
  // save to history
  const snapshot = toSnapshot(next);
  next.history = next.history.slice(0, next.historyIndex + 1);
  next.history.push(snapshot);
  next.historyIndex = next.history.length - 1;

  next.boards[miniBoardIndex][cellIndex] = next.currentPlayer;
  const miniWin = checkWinner(next.boards[miniBoardIndex] as (Mark | "draw" | null)[]);
  if (miniWin) {
    next.miniWinners[miniBoardIndex] = miniWin;
  } else if (isBoardFull(next.boards[miniBoardIndex])) {
    next.miniWinners[miniBoardIndex] = "draw";
  }

  let nextActive: number | null = cellIndex;
  if (next.miniWinners[cellIndex] !== null) {
    nextActive = null;
  }

  next.lastMove = { miniBoardIndex, cellIndex, player: next.currentPlayer };
  next.currentPlayer = next.currentPlayer === "X" ? "O" : "X";

  const gameWin = checkWinner(next.miniWinners);
  if (gameWin) {
    next.gameWinner = gameWin;
  }

  return next;
}

export function undo(state: GameState): GameState {
  if (state.historyIndex < 0) return state;
  const prev = state.history[state.historyIndex];
  const next: GameState = {
    boards: prev.boards.map((b) => [...b]),
    miniWinners: [...prev.miniWinners],
    currentPlayer: prev.currentPlayer,
    activeMiniBoard: prev.activeMiniBoard,
    lastMove: prev.lastMove ? { ...prev.lastMove } : null,
    gameWinner: prev.gameWinner,
    history: state.history,
    historyIndex: state.historyIndex - 1,
  };
  return next;
}

export function redo(state: GameState): GameState {
  if (state.historyIndex >= state.history.length - 1) return state;
  const nextIndex = state.historyIndex + 1;
  const snap = state.history[nextIndex];
  const next: GameState = {
    boards: snap.boards.map((b) => [...b]),
    miniWinners: [...snap.miniWinners],
    currentPlayer: snap.currentPlayer,
    activeMiniBoard: snap.activeMiniBoard,
    lastMove: snap.lastMove ? { ...snap.lastMove } : null,
    gameWinner: snap.gameWinner,
    history: state.history,
    historyIndex: nextIndex,
  };
  return next;
}

export function opposite(mark: Mark): Mark {
  return mark === "X" ? "O" : "X";
}
