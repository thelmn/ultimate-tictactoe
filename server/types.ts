// Protocol and state types for PartyKit server

export type Mark = "X" | "O";

// Player represents a logical user in the room (stable across reconnects).
export type Player = {
  id: string; // stable playerId, not the ephemeral connection id
  name?: string;
};

export type Scores = { X: number; O: number };

export type GameSnapshot = {
  boards: (Mark | null)[][]; // 9 mini-boards of 9 cells each
  miniWinners: (Mark | "draw" | null)[]; // per mini-board
  currentPlayer: Mark; // whose turn overall
  activeMiniBoard: number | null; // target mini-board index, or null for free choice
  lastMove: { miniBoardIndex: number; cellIndex: number; player: Mark } | null;
  gameWinner: Mark | null; // winner of the meta board
};

export type GameState = {
  boards: (Mark | null)[][]; // 9 mini-boards of 9 cells each
  miniWinners: (Mark | "draw" | null)[]; // per mini-board
  currentPlayer: Mark; // whose turn overall
  activeMiniBoard: number | null; // target mini-board index, or null for free choice
  lastMove: { miniBoardIndex: number; cellIndex: number; player: Mark } | null;
  gameWinner: Mark | null; // winner of the meta board
  history: GameSnapshot[]; // snapshots for undo/redo
  historyIndex: number; // pointer in history
};

export type RoomState = {
  players: Player[]; // up to 2
  scores: Scores;
  gamesIndex: string[]; // ordered list of gameIds in this room
  currentGameId?: string;
  pending?: { type: "new" | "undo" | "redo"; from: string; desiredMark?: Mark; gameId?: string };
};

// Messages
export type JoinMsg = { type: "join"; roomId: string; playerId: string; playerName?: string };
export type MoveMsg = { type: "move"; gameId: string; miniBoardIndex: number; cellIndex: number };
export type RequestMsg = { type: "request"; action: "new"; desiredMark: Mark } | { type: "request"; action: "undo" | "redo"; gameId: string };
export type ResponseMsg = { type: "response"; action: "new"; accepted: boolean } | { type: "response"; action: "undo" | "redo"; accepted: boolean; gameId: string };

// 'from' is the stable playerId
export type PendingReq = { type: "new"; from: string; desiredMark: Mark } | { type: "undo" | "redo"; from: string; gameId: string };
export type ServerRoomStateMsg = {
  type: "room_state";
  players: Player[];
  currentGameId?: string;
  scores: Scores;
  gamesIndex: string[];
  // 'you' is the stable playerId of the receiver
  you?: string;
  pending?: PendingReq;
};
// marks are keyed by stable playerId
export type GameCreatedMsg = { type: "game_created"; gameId: string; marks: Record<string, Mark>; game_state: GameState };
export type GameStateMsg = { type: "game_state"; gameId: string; state: GameState; marks?: Record<string, Mark> };
export type ErrorMsg = { type: "error"; code: string; message: string };

export type ClientMsg = JoinMsg | MoveMsg | RequestMsg | ResponseMsg;
export type ServerMsg = ServerRoomStateMsg | GameCreatedMsg | GameStateMsg | ErrorMsg;
