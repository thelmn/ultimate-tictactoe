"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { RotateCcw, Undo2, Redo2, Trophy, Users, Menu, X } from 'lucide-react';

type GameState = {
  boards: (string | null)[][];
  miniWinners: (string | null)[];
  currentPlayer: string;
  activeMiniBoard: number | null;
  lastMove: { miniBoardIndex: number; cellIndex: number; player: string } | null;
  gameWinner: string | null;
};

const UltimateTicTacToe = () => {
  // Initialize empty boards
  const createEmptyBoard = () => Array(9).fill(null).map(() => Array(9).fill(null));
  const createEmptyMiniWinners = () => Array(9).fill(null);
  
  const [boards, setBoards] = useState(createEmptyBoard());
  const [miniWinners, setMiniWinners] = useState(createEmptyMiniWinners());
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [activeMiniBoard, setActiveMiniBoard] = useState<number | null>(null);
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ miniBoardIndex: number; cellIndex: number; player: string } | null>(null);
  const [gameStats, setGameStats] = useState({ X: 0, O: 0 });
  const [moveHistory, setMoveHistory] = useState<GameState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [animatingCells, setAnimatingCells] = useState(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Check for three in a row
  const checkWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];
    
    for (let line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  // Check if mini-board is full
  const isBoardFull = (board: (string | null)[]) => board.every(cell => cell !== null);

  // Save game state to history
  const saveToHistory = (
    newBoards: (string | null)[][], 
    newMiniWinners: (string | null)[], 
    newCurrentPlayer: string, 
    newActiveMiniBoard: number | null, 
    newLastMove: { miniBoardIndex: number; cellIndex: number; player: string } | null
  ) => {
    const newState: GameState = {
      boards: newBoards,
      miniWinners: newMiniWinners,
      currentPlayer: newCurrentPlayer,
      activeMiniBoard: newActiveMiniBoard,
      lastMove: newLastMove,
      gameWinner: null
    };
    
    const newHistory = moveHistory.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setMoveHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle cell click
  const handleCellClick = (miniBoardIndex: number, cellIndex: number) => {
    if (gameWinner || boards[miniBoardIndex][cellIndex] || miniWinners[miniBoardIndex]) return;
    if (activeMiniBoard !== null && activeMiniBoard !== miniBoardIndex) return;

    // Animate the cell
    const cellKey = `${miniBoardIndex}-${cellIndex}`;
    setAnimatingCells(prev => new Set(prev).add(cellKey));
    setTimeout(() => {
      setAnimatingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }, 300);

    // Save current state to history
    saveToHistory(boards, miniWinners, currentPlayer, activeMiniBoard, lastMove);

    // Make the move
    const newBoards = boards.map((board, i) => 
      i === miniBoardIndex 
        ? board.map((cell, j) => j === cellIndex ? currentPlayer : cell)
        : [...board]
    );

    const newMiniWinners = [...miniWinners];
    const winner = checkWinner(newBoards[miniBoardIndex]);
    if (winner) {
      newMiniWinners[miniBoardIndex] = winner;
    } else if (isBoardFull(newBoards[miniBoardIndex])) {
      newMiniWinners[miniBoardIndex] = 'draw';
    }

    // Determine next active mini-board
    let nextActiveMiniBoard: number | null = cellIndex;
    if (newMiniWinners[cellIndex] !== null) {
      nextActiveMiniBoard = null; // Free choice
    }

    const newLastMove = { miniBoardIndex, cellIndex, player: currentPlayer };
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

    setBoards(newBoards);
    setMiniWinners(newMiniWinners);
    setCurrentPlayer(nextPlayer);
    setActiveMiniBoard(nextActiveMiniBoard);
    setLastMove(newLastMove);

    // Check for game winner
    const gameWin = checkWinner(newMiniWinners);
    if (gameWin && gameWin !== 'draw' && (gameWin === 'X' || gameWin === 'O')) {
      setGameWinner(gameWin);
      setGameStats(prev => ({ ...prev, [gameWin]: prev[gameWin] + 1 }));
    }
  };

  // Reset game
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
    setIsSidebarOpen(false); // Close sidebar when starting new game
  };

  // Undo move
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

  // Redo move
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
      
      // Check for winner after redo
      const gameWin = checkWinner(nextState.miniWinners);
      if (gameWin && gameWin !== 'draw') {
        setGameWinner(gameWin);
      }
    }
  };

  // Get cell classes
  const getCellClasses = (miniBoardIndex: number, cellIndex: number, cell: string | null) => {
    const cellKey = `${miniBoardIndex}-${cellIndex}`;
    const isLastMove = lastMove && lastMove.miniBoardIndex === miniBoardIndex && lastMove.cellIndex === cellIndex;
    const isAnimating = animatingCells.has(cellKey);
    
    let classes = "w-6 h-6 md:w-8 md:h-8 border border-gray-300 flex items-center justify-center text-sm md:text-lg font-bold cursor-pointer transition-all duration-200 ";
    
    if (cell) {
      classes += cell === 'X' ? 'text-blue-600 bg-blue-50 ' : 'text-red-600 bg-red-50 ';
    } else {
      classes += "hover:bg-gray-100 ";
    }
    
    if (isLastMove) {
      classes += "ring-2 ring-yellow-400 ring-opacity-70 ";
    }
    
    if (isAnimating) {
      classes += "scale-110 ";
    }
    
    return classes;
  };

  // Get mini-board classes
  const getMiniBoardClasses = (miniBoardIndex: number) => {
    const isActive = activeMiniBoard === null || activeMiniBoard === miniBoardIndex;
    const isTargeted = activeMiniBoard === miniBoardIndex;
    const winner = miniWinners[miniBoardIndex];
    
    let classes = "grid grid-cols-3 gap-1 p-2 rounded-lg transition-all duration-300 ";
    
    if (winner) {
      if (winner === 'X') classes += "bg-blue-200 ";
      else if (winner === 'O') classes += "bg-red-200 ";
      else classes += "bg-gray-200 ";
    } else if (!isActive) {
      classes += "opacity-30 ";
    } else if (isTargeted) {
      classes += "ring-2 ring-green-500 bg-green-50 ";
    } else {
      classes += "bg-white ";
    }
    
    return classes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Title and Menu Button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Ultimate Tic-Tac-Toe</h1>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden bg-white rounded-lg p-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        {/* Mobile Modal Overlay */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-4" onClick={() => setIsSidebarOpen(false)}>
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 h-full w-full max-w-md overflow-y-auto rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white border-opacity-30">
                <h2 className="text-xl font-bold text-gray-800">Game Controls</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-4 space-y-6">
                {/* Action Panel */}
                <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                    <Users className="w-5 h-5" />
                    Actions
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={resetGame}
                      className="w-full flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-lg"
                    >
                      <RotateCcw className="w-5 h-5" />
                      New Game
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={undoMove}
                        disabled={historyIndex < 0}
                        className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Undo2 className="w-4 h-4" />
                        Undo
                      </button>
                      <button
                        onClick={redoMove}
                        disabled={historyIndex >= moveHistory.length - 1}
                        className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Redo2 className="w-4 h-4" />
                        Redo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats Panel */}
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
                      <div className="text-gray-600">
                        Total Games: {gameStats.X + gameStats.O}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rules Panel */}
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
          <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6">
            <div className="grid grid-cols-3 gap-2 md:gap-4 w-72 h-72 md:w-96 md:h-96">
              {boards.map((miniBoard, miniBoardIndex) => (
                <div 
                  key={miniBoardIndex} 
                  className={getMiniBoardClasses(miniBoardIndex)}
                >
                  {miniWinners[miniBoardIndex] ? (
                    <div className="col-span-3 flex items-center justify-center h-full">
                      <span className="text-2xl md:text-4xl font-bold">
                        {miniWinners[miniBoardIndex] === 'draw' ? '−' : miniWinners[miniBoardIndex]}
                      </span>
                    </div>
                  ) : (
                    miniBoard.map((cell, cellIndex) => (
                      <button
                        key={cellIndex}
                        className={getCellClasses(miniBoardIndex, cellIndex, cell)}
                        onClick={() => handleCellClick(miniBoardIndex, cellIndex)}
                        disabled={gameWinner || cell || miniWinners[miniBoardIndex] || (activeMiniBoard !== null && activeMiniBoard !== miniBoardIndex)}
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
              {gameWinner ? (
                <div className="text-xl md:text-2xl font-bold text-green-600">
                  🎉 Player {gameWinner} Wins! 🎉
                </div>
              ) : (
                <div className="text-lg md:text-xl">
                  <span className="font-semibold">Current Player: </span>
                  <span className={`font-bold ${currentPlayer === 'X' ? 'text-blue-600' : 'text-red-600'}`}>
                    {currentPlayer}
                  </span>
                  {activeMiniBoard !== null && (
                    <div className="text-xs md:text-sm text-gray-600 mt-1">
                      Must play in board {activeMiniBoard + 1}
                    </div>
                  )}
                  {activeMiniBoard === null && !gameWinner && (
                    <div className="text-xs md:text-sm text-green-600 mt-1">
                      Free choice - play anywhere!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Medium+ Screens Sidebar - Always Visible */}
          <div className="hidden md:flex flex-col space-y-6">
            {/* Action Panel */}
            <div className="bg-white rounded-2xl shadow-xl p-6 min-w-64">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={resetGame}
                  className="w-full flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Game
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={undoMove}
                    disabled={historyIndex < 0}
                    className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Undo2 className="w-4 h-4" />
                    Undo
                  </button>
                  <button
                    onClick={redoMove}
                    disabled={historyIndex >= moveHistory.length - 1}
                    className="flex-1 flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Redo2 className="w-4 h-4" />
                    Redo
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
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
                  <div className="text-sm text-gray-600">
                    Total Games: {gameStats.X + gameStats.O}
                  </div>
                </div>
              </div>
            </div>

            {/* Rules Panel */}
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