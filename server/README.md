# PartyKit server for Ultimate Tic-Tac-Toe

This folder contains the PartyKit server and config for online multiplayer.

## Dev

1. Install the PartyKit CLI (global or dev dep)
   - Global: npm i -g partykit
   - Or dev dep: npm i -D partykit
2. Start the PartyKit server:
   - npm run dev:server
3. Start Next.js app in another terminal:
   - npm run dev

Set NEXT_PUBLIC_PARTYKIT_HOST to the host:port printed by the PartyKit dev server (e.g., 127.0.0.1:1999).
Optionally, set NEXT_PUBLIC_PARTYKIT_NAME (defaults to ultimate_tictactoe).

## Deploy

Use partykit deploy. Update server/partykit.json and NEXT_PUBLIC_PARTYKIT_HOST accordingly.

## Protocol (summary)
- join: { type: "join", roomId }
- room_state: { type: "room_state", players, currentGameId, scores, gamesIndex, you, pending? }
- request new: { type: "request", action: "new", desiredMark: "X"|"O" }
- response new: { type: "response", action: "new", accepted }
- game_created: { type: "game_created", gameId, marks, game_state }
- move: { type: "move", gameId, miniBoardIndex, cellIndex }
- game_state: { type: "game_state", gameId, state, marks? }
- request undo/redo: { type: "request", action: "undo"|"redo", gameId }
- response undo/redo: { type: "response", action: "undo"|"redo", accepted, gameId }
