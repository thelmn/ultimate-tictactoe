# Ultimate Tic-Tac-Toe (Next.js + PartyKit)

This app supports online multiplayer via PartyKit.

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
