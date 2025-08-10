// @ts-nocheck
// PartyKit Room server for Ultimate Tic-Tac-Toe
// Two-player rooms only; per-new-game mark selection by requester

import type { Party, Connection } from "partykit/server";
import { initialGameState, applyMove, undo, redo, opposite } from "./utils";
import type { GameState, Mark, RoomState, ClientMsg, ServerMsg, Player } from "./types";

export default class RoomServer implements Party.Server {
  party: Party;
  state: RoomState;
  gameMarks: Map<string, Record<string, Mark>>; // gameId -> { playerId: Mark }
  games: Map<string, GameState>;
  // connection and player identity mapping
  connToPlayer: Map<string, string>; // conn.id -> playerId
  playerToConn: Map<string, string>; // playerId -> conn.id

  constructor(party: Party) {
    this.party = party;
    this.state = {
      players: [],
      scores: { X: 0, O: 0 },
      gamesIndex: [],
    };
  this.games = new Map();
  this.gameMarks = new Map();
  this.connToPlayer = new Map();
  this.playerToConn = new Map();
  // eslint-disable-next-line no-console
  console.log('[Party][init]', { roomId: party.id });
  }

  onConnect(conn: Connection) {
    // eslint-disable-next-line no-console
    console.log('[Party][connect]', { roomId: this.party.id, conn: conn.id, players: this.state.players.length });
    // We don't add to players until we receive a join with a stable playerId.
  }

  onClose(conn: Connection) {
    // eslint-disable-next-line no-console
    console.log('[Party][close]', { roomId: this.party.id, conn: conn.id });
    const playerId = this.connToPlayer.get(conn.id);
    if (playerId) {
      this.connToPlayer.delete(conn.id);
      this.playerToConn.delete(playerId);
      // Remove from active players
      this.state.players = this.state.players.filter((p) => p.id !== playerId);
      this.broadcastRoomState();
    }
  }

  onMessage(message: string, sender: Connection) {
  // eslint-disable-next-line no-console
  console.log('[Party][message]', { roomId: this.party.id, from: sender.id, raw: message });
    let data: ClientMsg;
    try {
      data = JSON.parse(message);
    } catch {
      sender.send(JSON.stringify({ type: "error", code: "bad_json", message: "Invalid JSON" } as ServerMsg));
      return;
    }

    if (data.type === "join") {
      const { playerId } = data as any;
      if (!playerId) {
        sender.send(JSON.stringify({ type: "error", code: "missing_playerId", message: "join requires playerId" } as ServerMsg));
        return;
      }
      // If room has 2 distinct players and this is a new player, reject
      const isKnown = this.state.players.some(p => p.id === playerId);
      if (!isKnown && this.state.players.length >= 2) {
        const msg: ServerMsg = { type: "error", code: "room_full", message: "Room is full" } as any;
        sender.send(JSON.stringify(msg));
        sender.close();
        return;
      }
      // Map connection to player
      this.connToPlayer.set(sender.id, playerId);
      this.playerToConn.set(playerId, sender.id);
      // Add to active players if new
      if (!isKnown) {
        const p: Player = { id: playerId };
        this.state.players.push(p);
      }
      // Echo current room state
      this.broadcastRoomState();
      this.broadcastRoomState(sender);
      // Also send current game state (including marks) if a game is active
      const gameId = this.state.currentGameId;
      if (gameId) {
        const game = this.games.get(gameId);
        if (game) {
          const marks = this.gameMarks.get(gameId) || undefined;
          const msg: ServerMsg = { type: "game_state", gameId, state: game, marks };
          sender.send(JSON.stringify(msg));
        }
      }
      return;
    }

  // Validate that sender is one of the two players (by stable playerId)
  const senderPlayerId = this.connToPlayer.get(sender.id);
  const isPlayer = !!senderPlayerId && this.state.players.some((p) => p.id === senderPlayerId);
    if (!isPlayer) {
      sender.send(JSON.stringify({ type: "error", code: "not_player", message: "Only players can send commands" } as ServerMsg));
      return;
    }

    switch (data.type) {
      case "request": {
        if (data.action === "new") {
          // store pending request with desired mark, notify the other player
          this.state.pending = { type: "new", from: senderPlayerId!, desiredMark: data.desiredMark };
          // eslint-disable-next-line no-console
          console.log('[Party][request:new]', { roomId: this.party.id, from: senderPlayerId, desired: data.desiredMark });
          this.broadcastRoomState();
        } else {
          // undo/redo requests must specify current gameId
          const gameId = data.gameId || this.state.currentGameId;
          if (!gameId) return;
          this.state.pending = { type: data.action, from: senderPlayerId!, gameId };
          // eslint-disable-next-line no-console
          console.log('[Party][request]', { roomId: this.party.id, type: data.action, from: senderPlayerId, gameId });
          this.broadcastRoomState();
        }
        break;
      }
      case "response": {
        const pending = this.state.pending;
        if (!pending) return;
        const other = this.otherPlayerId(pending.from);
        // Allow decline by either side (opponent or requester -> cancel)
        if (!data.accepted) {
          if (senderPlayerId === pending.from || (other && senderPlayerId === other)) {
            this.state.pending = undefined;
            this.broadcastRoomState();
            // eslint-disable-next-line no-console
            console.log('[Party][response:decline/cancel]', { roomId: this.party.id, from: senderPlayerId });
          }
          return;
        }
        // For accept, only the other (non-requester) can accept
        if (!other || other !== senderPlayerId) return;
        if (pending.type === "new") {
          this.state.pending = undefined;
          const gameId = crypto.randomUUID();
          const game = initialGameState();
          this.games.set(gameId, game);
          this.state.gamesIndex.push(gameId);
          this.state.currentGameId = gameId;
          // assign marks per request
          const marks: Record<string, Mark> = {};
          marks[pending.from] = pending.desiredMark!;
          marks[senderPlayerId!] = opposite(pending.desiredMark!);
          this.gameMarks.set(gameId, marks);
          // broadcast game_created and initial state
          const created: ServerMsg = { type: "game_created", gameId, marks, game_state: game };
          this.party.broadcast(JSON.stringify(created));
          this.broadcastRoomState();
          // eslint-disable-next-line no-console
          console.log('[Party][game_created]', { roomId: this.party.id, gameId, marks });
        } else if (pending.type === "undo" || pending.type === "redo") {
          const gameId = pending.gameId!;
          let game = this.games.get(gameId);
          if (!game) return;
          game = pending.type === "undo" ? undo(game) : redo(game);
          this.games.set(gameId, game);
          this.state.pending = undefined;
          this.broadcastGameState(gameId);
          // eslint-disable-next-line no-console
          console.log('[Party][apply]', { roomId: this.party.id, type: pending.type, gameId });
        }
        break;
      }
      case "move": {
        const { gameId, miniBoardIndex, cellIndex } = data;
        const game = this.games.get(gameId);
        if (!game) return;
        const marks = this.gameMarks.get(gameId);
        if (!marks) return;
        const myMark = marks[senderPlayerId!];
        if (!myMark) return; // not part of this game
        if (game.currentPlayer !== myMark) return; // not your turn
        // eslint-disable-next-line no-console
        console.log('[Party][move]', { roomId: this.party.id, from: senderPlayerId, gameId, miniBoardIndex, cellIndex });
        const next = applyMove(game, miniBoardIndex, cellIndex);
        if (next === game) return;
        // update scores if game ended
        if (!game.gameWinner && next.gameWinner) {
          this.state.scores[next.gameWinner] += 1;
        }
        this.games.set(gameId, next);
        this.broadcastGameState(gameId);
        break;
      }
    }
  }

  broadcastRoomState(target?: Connection) {
    const base = {
      type: "room_state",
      players: this.state.players,
      currentGameId: this.state.currentGameId,
      scores: this.state.scores,
      gamesIndex: this.state.gamesIndex,
      pending: this.state.pending,
    } as any;
    const you = target ? this.connToPlayer.get(target.id) : undefined;
    const msg = you ? { ...base, you } : base;
    const payload = JSON.stringify(msg as ServerMsg);
    if (target) target.send(payload);
    else this.party.broadcast(payload);
  // eslint-disable-next-line no-console
    console.log('[Party][broadcast room_state]', { roomId: this.party.id, to: target ? you : 'all', players: this.state.players.length, currentGameId: this.state.currentGameId, pending: !!this.state.pending });
  }

  broadcastGameState(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    const marks = this.gameMarks.get(gameId) || undefined;
    const msg: ServerMsg = { type: "game_state", gameId, state: game, marks };
    this.party.broadcast(JSON.stringify(msg));
  // eslint-disable-next-line no-console
  console.log('[Party][broadcast game_state]', { roomId: this.party.id, gameId });
  }

  otherPlayerId(id: string): string | undefined {
    const other = this.state.players.find((p) => p.id !== id);
    return other?.id;
  }
}

export const onRequest: Party.FetchHandler = (_req, _lobby) => {
  return new Response("OK", { status: 200 });
};
