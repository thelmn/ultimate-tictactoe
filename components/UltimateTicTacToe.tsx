"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Undo2, Redo2, Trophy, Users, Menu, X, Copy, ArrowRight, Wifi, WifiOff } from 'lucide-react';

// Matches the server's shape used by the online pages
export type GameState = {
  boards: (string | null)[][];
  miniWinners: (string | null)[];
  currentPlayer: 'X' | 'O';
  activeMiniBoard: number | null;
  lastMove: { miniBoardIndex: number; cellIndex: number; player: 'X' | 'O' } | null;
  gameWinner: 'X' | 'O' | null;
};

export type UltimateProps = {
  mode?: 'offline' | 'online';
  onlineState?: GameState | null;
  myMark?: 'X' | 'O';
  canPlay?: boolean;
  onMove?: (miniBoardIndex: number, cellIndex: number) => void;
  pending?: { type: 'new' | 'undo' | 'redo'; desiredMark?: 'X' | 'O'; fromIsMe: boolean } | null;
  onRespond?: (accepted: boolean) => void;
  onRequestNew?: (mark: 'X' | 'O') => void;
  onRequestUndo?: () => void;
  onRequestRedo?: () => void;
};

const UltimateTicTacToe = ({ mode = 'offline', onlineState, myMark, canPlay = false, onMove, pending, onRespond, onRequestNew, onRequestUndo, onRequestRedo }: UltimateProps) => {
  // Offline state
  const createEmptyBoard = () => Array(9).fill(null).map(() => Array(9).fill(null));
  const createEmptyMiniWinners = () => Array(9).fill(null);

  const [boards, setBoards] = useState<(string | null)[][]>(createEmptyBoard());
  const [miniWinners, setMiniWinners] = useState<(string | null)[]>(createEmptyMiniWinners());
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [activeMiniBoard, setActiveMiniBoard] = useState<number | null>(null);
  const [gameWinner, setGameWinner] = useState<'X' | 'O' | null>(null);
  const [lastMove, setLastMove] = useState<{ miniBoardIndex: number; cellIndex: number; player: 'X' | 'O' } | null>(null);
  const [gameStats, setGameStats] = useState<{ X: number; O: number }>({ X: 0, O: 0 });
  const [moveHistory, setMoveHistory] = useState<GameState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const router = useRouter();

  // Demo-only: offline landing "Play Online" panels
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedRoomCode, setConnectedRoomCode] = useState('');

  // Derived state to unify UI
  const isOnline = mode === 'online' && !!onlineState;
  const dBoards = isOnline && onlineState ? onlineState.boards : boards;
  const dMiniWinners = isOnline && onlineState ? onlineState.miniWinners : miniWinners;
  const dCurrentPlayer = isOnline && onlineState ? onlineState.currentPlayer : currentPlayer;
  const dActiveMiniBoard = isOnline && onlineState ? onlineState.activeMiniBoard : activeMiniBoard;
  const dGameWinner = isOnline && onlineState ? onlineState.gameWinner : gameWinner;
  const dLastMove = isOnline && onlineState ? onlineState.lastMove : lastMove;

  // Helpers (offline)
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  const checkWinner = (cells: (string | null)[]) => {
    for (const [a, b, c] of lines) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
    }
    return null;
  };
  const isBoardFull = (cells: (string | null)[]) => cells.every(c => c !== null);

  // Online last-move animation (when server updates lastMove)
  useEffect(() => {
    if (!isOnline || !dLastMove) return;
    const key = `${dLastMove.miniBoardIndex}-${dLastMove.cellIndex}`;
    setAnimatingCells(prev => new Set(prev).add(key));
    const t = setTimeout(() => {
      setAnimatingCells(prev => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [isOnline, dLastMove?.miniBoardIndex, dLastMove?.cellIndex]);

  // History (offline)
  const saveToHistory = (
    newBoards: (string | null)[][],
    newMiniWinners: (string | null)[],
    newCurrentPlayer: 'X' | 'O',
    newActiveMiniBoard: number | null,
    newLastMove: { miniBoardIndex: number; cellIndex: number; player: 'X' | 'O' } | null,
  ) => {
    const newState: GameState = {
      boards: newBoards,
      miniWinners: newMiniWinners,
      currentPlayer: newCurrentPlayer,
      activeMiniBoard: newActiveMiniBoard,
      lastMove: newLastMove,
      gameWinner: null,
    };
    const newHistory = moveHistory.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setMoveHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Unified game rule validation
  const isValidMove = (
    gameState: {
      gameWinner: 'X' | 'O' | null;
      boards: (string | null)[][];
      miniWinners: (string | null)[];
      activeMiniBoard: number | null;
      currentPlayer: 'X' | 'O';
    },
    miniBoardIndex: number,
    cellIndex: number,
    playerMark?: 'X' | 'O'
  ) => {
    // Game is already won
    if (gameState.gameWinner) return false;
    
    // Cell is already occupied
    if (gameState.boards[miniBoardIndex][cellIndex]) return false;
    
    // Mini-board is already won or drawn
    if (gameState.miniWinners[miniBoardIndex]) return false;
    
    // Must play in the active mini-board if one is specified
    if (gameState.activeMiniBoard !== null && gameState.activeMiniBoard !== miniBoardIndex) return false;
    
    // In online mode, check if it's the player's turn
    if (playerMark && gameState.currentPlayer !== playerMark) return false;
    
    return true;
  };

  // Handle a click
  const handleCellClick = (miniBoardIndex: number, cellIndex: number) => {
    if (isOnline) {
      if (!onlineState || !canPlay || !myMark) return;
      
      // Use unified validation for online mode
      if (!isValidMove(onlineState, miniBoardIndex, cellIndex, myMark)) return;
      
      onMove?.(miniBoardIndex, cellIndex);
      return;
    }

    // Use unified validation for offline mode
    const currentGameState = {
      gameWinner,
      boards,
      miniWinners,
      activeMiniBoard,
      currentPlayer
    };
    if (!isValidMove(currentGameState, miniBoardIndex, cellIndex)) return;

    const cellKey = `${miniBoardIndex}-${cellIndex}`;
    setAnimatingCells(prev => new Set(prev).add(cellKey));
    setTimeout(() => {
      setAnimatingCells(prev => {
        const s = new Set(prev);
        s.delete(cellKey);
        return s;
      });
    }, 200);

    saveToHistory(boards, miniWinners, currentPlayer, activeMiniBoard, lastMove);

    const newBoards = boards.map((board, i) =>
      i === miniBoardIndex ? board.map((cell, j) => (j === cellIndex ? currentPlayer : cell)) : [...board]
    );

    const newMiniWinners = [...miniWinners];
    const miniWinner = checkWinner(newBoards[miniBoardIndex]);
    if (miniWinner) newMiniWinners[miniBoardIndex] = miniWinner;
    else if (isBoardFull(newBoards[miniBoardIndex])) newMiniWinners[miniBoardIndex] = 'draw';

    let nextActiveMiniBoard: number | null = cellIndex;
    if (newMiniWinners[cellIndex] !== null) nextActiveMiniBoard = null;

    const newLastMove = { miniBoardIndex, cellIndex, player: currentPlayer } as const;
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

    setBoards(newBoards);
    setMiniWinners(newMiniWinners);
    setCurrentPlayer(nextPlayer);
    setActiveMiniBoard(nextActiveMiniBoard);
    setLastMove(newLastMove);

    const gameWin = checkWinner(newMiniWinners);
    if (gameWin === 'X' || gameWin === 'O') {
      setGameWinner(gameWin);
      setGameStats(prev => ({ ...prev, [gameWin]: prev[gameWin] + 1 }));
    }
  };

  // Offline controls
  const resetGame = () => {
    setBoards(createEmptyBoard());
    setMiniWinners(createEmptyMiniWinners());
    setCurrentPlayer('X');
    setActiveMiniBoard(null);
    setGameWinner(null);
    setLastMove(null);
    setMoveHistory([]);
    setHistoryIndex(-1);
    setAnimatingCells(new Set());
    setIsSidebarOpen(false);
  };

  const undoMove = () => {
    if (historyIndex >= 0) {
      const prevState = moveHistory[historyIndex];
      setBoards(prevState.boards);
      setMiniWinners(prevState.miniWinners);
      setCurrentPlayer(prevState.currentPlayer);
      setActiveMiniBoard(prevState.activeMiniBoard);
      setLastMove(prevState.lastMove);
      setGameWinner(null);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redoMove = () => {
    if (historyIndex < moveHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = moveHistory[nextIndex];
      setBoards(nextState.boards);
      setMiniWinners(nextState.miniWinners);
      setCurrentPlayer(nextState.currentPlayer);
      setActiveMiniBoard(nextState.activeMiniBoard);
      setLastMove(nextState.lastMove);
      setHistoryIndex(nextIndex);
      const gameWin = checkWinner(nextState.miniWinners);
      if (gameWin === 'X' || gameWin === 'O') setGameWinner(gameWin);
    }
  };

  const getCellClasses = (miniBoardIndex: number, cellIndex: number, cell: string | null) => {
    const cellKey = `${miniBoardIndex}-${cellIndex}`;
    const isLast = !!(dLastMove && dLastMove.miniBoardIndex === miniBoardIndex && dLastMove.cellIndex === cellIndex);
    const isAnimating = animatingCells.has(cellKey);

    let classes = "w-6 h-6 md:w-8 md:h-8 border border-gray-300 flex items-center justify-center text-sm md:text-lg font-bold cursor-pointer transition-all duration-200 ";
    if (cell) classes += cell === 'X' ? 'text-blue-600 bg-blue-50 ' : 'text-red-600 bg-red-50 ';
    else classes += 'hover:bg-gray-100 ';
    if (isLast) classes += 'ring-2 ring-yellow-400 ring-opacity-70 ';
    if (isAnimating) classes += 'scale-110 ';
    return classes;
  };

  // Demo helper panels
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setRoomCode(code);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const connectToRoom = () => {
    const codeToConnect = roomCode || inputCode;
    setConnectedRoomCode(codeToConnect);
    setIsConnected(true);
    if (codeToConnect && mode === 'offline') router.push(`/${codeToConnect}`);
  };

  const disconnectFromRoom = () => {
    setIsConnected(false);
    setConnectedRoomCode('');
    setRoomCode('');
    setInputCode('');
  };

  const getMiniBoardClasses = (miniBoardIndex: number) => {
    const activeMB = dActiveMiniBoard;
    const winners = dMiniWinners;
    const isActive = activeMB === null || activeMB === miniBoardIndex;
    const isTargeted = activeMB === miniBoardIndex;
    const winner = winners[miniBoardIndex];

    let classes = 'grid grid-cols-3 gap-1 p-2 rounded-lg transition-all duration-300 ';
    if (winner) {
      if (winner === 'X') classes += 'bg-blue-200 ';
      else if (winner === 'O') classes += 'bg-red-200 ';
      else classes += 'bg-gray-200 ';
    } else if (!isActive) classes += 'opacity-30 ';
    else if (isTargeted) classes += 'ring-2 ring-green-500 bg-green-50 ';
    else classes += 'bg-white ';
    return classes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Ultimate Tic-Tac-Toe</h1>
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-white rounded-lg p-2 shadow-lg hover:shadow-xl transition-shadow">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Modal Overlay */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-4 px-4" onClick={() => setIsSidebarOpen(false)}>
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 h-full w-full max-w-md overflow-y-auto rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-white border-opacity-30">
                <h2 className="text-xl font-bold text-gray-800">Game Controls</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>
              <div className="p-4 space-y-6">
                {mode === 'offline' && (
                  <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                      <Wifi className="w-5 h-5" />
                      Play Online
                    </h3>
                    {!isConnected ? (
                      <div className="space-y-3">
                        <button onClick={roomCode ? copyToClipboard : generateRoomCode} className="w-full flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg">
                          {roomCode ? (
                            <>
                              <Copy className="w-5 h-5" />
                              {roomCode}
                            </>
                          ) : (
                            <>
                              <Wifi className="w-5 h-5" />
                              Generate room code
                            </>
                          )}
                        </button>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Enter room code" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 6))} className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono text-lg" maxLength={6} />
                          <button onClick={connectToRoom} disabled={inputCode.length !== 6 && !roomCode} className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-center py-2">
                          <span className="text-green-600 font-semibold">Connected to room </span>
                          <span className="font-mono text-lg font-bold">{connectedRoomCode}</span>
                        </div>
                        <button onClick={disconnectFromRoom} className="w-full flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors">
                          <WifiOff className="w-5 h-5" />
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                    <Users className="w-5 h-5" />
                    Actions
                  </h3>
                  <div className="space-y-3">
                    {mode === 'offline' && (
                      <button onClick={resetGame} className="w-full flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-lg">
                        <RotateCcw className="w-5 h-5" />
                        New Game
                      </button>
                    )}
                    <div className="flex gap-2">
                      {mode === 'offline' && (
                        <>
                          <button onClick={undoMove} disabled={historyIndex < 0} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <Undo2 className="w-4 h-4" />
                            Undo
                          </button>
                          <button onClick={redoMove} disabled={historyIndex >= moveHistory.length - 1} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <Redo2 className="w-4 h-4" />
                            Redo
                          </button>
                        </>
                      )}
                    </div>
                    {isOnline && (
                      <>
                        <div className="flex gap-2">
                          <button onClick={() => onRequestNew?.('X')} disabled={!!pending} className="flex-1 bg-blue-600 text-white px-3 py-3 rounded-lg disabled:opacity-50 text-sm">New Game as X</button>
                          <button onClick={() => onRequestNew?.('O')} disabled={!!pending} className="flex-1 bg-red-600 text-white px-3 py-3 rounded-lg disabled:opacity-50 text-sm">New Game as O</button>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={onRequestUndo} disabled={!!pending || !onlineState} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg disabled:opacity-50 text-sm">
                            <Undo2 className="w-4 h-4" /> Undo
                          </button>
                          <button onClick={onRequestRedo} disabled={!!pending || !onlineState} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg disabled:opacity-50 text-sm">
                            <Redo2 className="w-4 h-4" /> Redo
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                    <Trophy className="w-5 h-5" />
                    Game Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 font-semibold text-lg">Player X:</span>
                      <span className="text-3xl font-bold text-blue-600">{gameStats.X}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600 font-semibold text-lg">Player O:</span>
                      <span className="text-3xl font-bold text-red-600">{gameStats.O}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-300">
                      <div className="text-gray-600">Total Games: {gameStats.X + gameStats.O}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">How to Play</h3>
                  <div className="text-gray-700 space-y-3">
                    <p>• Win 3 mini-boards in a row to win the game</p>
                    <p>• Your move determines where your opponent must play next</p>
                    <p>• If sent to a closed board, you can play anywhere</p>
                    <p>• Green outline = must play here</p>
                    <p>• Yellow outline = last move played</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-8 justify-center">
          {/* Game Board */}
          <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 relative">
            {/* Pending request modal overlay (online) */}
            {isOnline && onlineState && pending && (
              <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center">
                  {pending.fromIsMe ? (
                    <>
                      <div className="font-semibold mb-2">Awaiting opponent response…</div>
                      <div className="text-sm text-gray-600 mb-4">
                        {pending.type === 'new' ? `New game${pending.desiredMark ? ` as ${pending.desiredMark}` : ''}` : pending.type.toUpperCase()}
                      </div>
                      <button onClick={() => onRespond?.(false)} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</button>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold mb-2">Opponent requests</div>
                      <div className="text-sm text-gray-600 mb-4">
                        {pending.type === 'new' ? `Start new game${pending.desiredMark ? ` as ${pending.desiredMark}` : ''}?` : `${pending.type.toUpperCase()} last move?`}
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => onRespond?.(true)} className="px-4 py-2 bg-green-600 text-white rounded">Accept</button>
                        <button onClick={() => onRespond?.(false)} className="px-4 py-2 bg-gray-500 text-white rounded">Decline</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 md:gap-4 w-72 h-72 md:w-96 md:h-96">
              {dBoards.map((miniBoard, miniBoardIndex) => (
                <div key={miniBoardIndex} className={getMiniBoardClasses(miniBoardIndex)}>
                  {dMiniWinners[miniBoardIndex] ? (
                    <div className="col-span-3 flex items-center justify-center h-full">
                      <span className="text-2xl md:text-4xl font-bold">{dMiniWinners[miniBoardIndex] === 'draw' ? '−' : dMiniWinners[miniBoardIndex]}</span>
                    </div>
                  ) : (
                    miniBoard.map((cell, cellIndex) => (
                      <button
                        key={cellIndex}
                        className={getCellClasses(miniBoardIndex, cellIndex, cell)}
                        onClick={() => handleCellClick(miniBoardIndex, cellIndex)}
                        disabled={
                          isOnline
                            ? !isValidMove({
                                gameWinner: dGameWinner,
                                boards: dBoards,
                                miniWinners: dMiniWinners,
                                currentPlayer: dCurrentPlayer,
                                activeMiniBoard: dActiveMiniBoard
                              }, miniBoardIndex, cellIndex, myMark) || !canPlay
                            : !isValidMove({
                                gameWinner,
                                boards,
                                miniWinners,
                                activeMiniBoard,
                                currentPlayer
                              }, miniBoardIndex, cellIndex)
                        }
                      >
                        {cell}
                      </button>
                    ))
                  )}
                </div>
              ))}
            </div>

            {/* Game Status */}
            <div className="mt-4 md:mt-6 text-center">
              {dGameWinner ? (
                <div className="text-xl md:text-2xl font-bold text-green-600">🎉 Player {dGameWinner} Wins! 🎉</div>
              ) : (
                <div className="text-lg md:text-xl">
                  <span className="font-semibold">Current Player: </span>
                  <span className={`font-bold ${dCurrentPlayer === 'X' ? 'text-blue-600' : 'text-red-600'}`}>{dCurrentPlayer}</span>
                  {dActiveMiniBoard !== null && (
                    <div className="text-xs md:text-sm text-gray-600 mt-1">Must play in board {dActiveMiniBoard + 1}</div>
                  )}
                  {dActiveMiniBoard === null && !dGameWinner && (
                    <div className="text-xs md:text-sm text-green-600 mt-1">Free choice - play anywhere!</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (md+) */}
          <div className="hidden md:flex flex-col space-y-6">
            {mode === 'offline' && (
              <div className="bg-white rounded-2xl shadow-xl p-6 min-w-64">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Play Online
                </h3>
                {!isConnected ? (
                  <div className="space-y-3">
                    <button onClick={roomCode ? copyToClipboard : generateRoomCode} className="w-full flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                      {roomCode ? (
                        <>
                          <Copy className="w-4 h-4" />
                          {roomCode}
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4" />
                          Generate room code
                        </>
                      )}
                    </button>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Enter room code" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 6))} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono" maxLength={6} />
                      <button onClick={connectToRoom} disabled={inputCode.length !== 6 && !roomCode} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center py-2">
                      <span className="text-green-600 font-semibold">Connected to room </span>
                      <span className="font-mono font-bold">{connectedRoomCode}</span>
                    </div>
                    <button onClick={disconnectFromRoom} className="w-full flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      <WifiOff className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-xl p-6 min-w-64">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Actions
              </h3>
              <div className="space-y-3">
                {mode === 'offline' && (
                  <button onClick={resetGame} className="w-full flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    <RotateCcw className="w-4 h-4" />
                    New Game
                  </button>
                )}
                {isOnline ? (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => onRequestNew?.('X')} disabled={!!pending} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">New Game as X</button>
                      <button onClick={() => onRequestNew?.('O')} disabled={!!pending} className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">New Game as O</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={onRequestUndo} disabled={!!pending || !onlineState} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">
                        <Undo2 className="w-4 h-4" /> Undo
                      </button>
                      <button onClick={onRequestRedo} disabled={!!pending || !onlineState} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">
                        <Redo2 className="w-4 h-4" /> Redo
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={undoMove} disabled={historyIndex < 0} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <Undo2 className="w-4 h-4" />
                      Undo
                    </button>
                    <button onClick={redoMove} disabled={historyIndex >= moveHistory.length - 1} className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <Redo2 className="w-4 h-4" />
                      Redo
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Game Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-semibold">Player X:</span>
                  <span className="text-2xl font-bold text-blue-600">{gameStats.X}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-semibold">Player O:</span>
                  <span className="text-2xl font-bold text-red-600">{gameStats.O}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600">Total Games: {gameStats.X + gameStats.O}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">How to Play</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p>• Win 3 mini-boards in a row to win the game</p>
                <p>• Your move determines where your opponent must play next</p>
                <p>• If sent to a closed board, you can play anywhere</p>
                <p>• Green outline = must play here</p>
                <p>• Yellow outline = last move played</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UltimateTicTacToe;