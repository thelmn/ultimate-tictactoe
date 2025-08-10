# Ultimate Tic-Tac-Toe with online multiplayer (Next.js + PartyKit)

### [Play here](https://ultimate-tictactoe-thelmn.vercel.app/)

Vibe-coded with Copilot Agent Mode :wink:


This app supports online multiplayer via PartyKit.

### Game rules:
https://en.wikipedia.org/wiki/Ultimate_tic-tac-toe


## Dev
- Install dependencies: npm install
- Start Next.js: npm run dev
- Start PartyKit: npm run dev:server
- Set env in .env.local:
  - NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
  - NEXT_PUBLIC_PARTYKIT_NAME=ultimate_tictactoe (optional)

## URLs
- Lobby: /[roomId]
- Game: /[roomId]/[gameId]

## Notes
- Two-player rooms only; third connection is rejected.
- On new game, requester chooses X or O; opponent accepts/declines.
