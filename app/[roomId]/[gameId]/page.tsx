"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import usePartySocket from 'partysocket/react';
import UltimateTicTacToe from '@/components/UltimateTicTacToe';

export default function GamePage() {
  const { roomId, gameId } = useParams<{ roomId: string; gameId: string }>();
  const [gameState, setGameState] = useState<any>(null);
  const [marks, setMarks] = useState<Record<string, 'X'|'O'> | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const host = useMemo(() => {
    let host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || '';
    if (!host && typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      host = isLocal ? '127.0.0.1:1999' : window.location.host;
      // eslint-disable-next-line no-console
      console.warn('[PartyClient] NEXT_PUBLIC_PARTYKIT_HOST not set; using', host);
    }
    return host;
  }, []);
  const party = process.env.NEXT_PUBLIC_PARTYKIT_NAME || 'ultimate_tictactoe';
  // Generate or load stable playerId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let pid = localStorage.getItem('utt-player-id');
    if (!pid) {
      pid = (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem('utt-player-id', pid);
    }
    setPlayerId(pid);
  }, []);
  const ws = usePartySocket({
    host,
    party,
    room: roomId,
    onOpen() {
      console.log('[GamePage] connected', { host, party, roomId, gameId });
      const pid = typeof window !== 'undefined' ? (localStorage.getItem('utt-player-id') || playerId) : playerId;
      ws?.send(JSON.stringify({ type: 'join', roomId, playerId: pid }));
    },
    onMessage(e: MessageEvent) {
      let msg: any; try { msg = JSON.parse((e as any).data); } catch { return; }
      console.log('[GamePage] message', msg);
      if (msg.type === 'game_state' && msg.gameId === gameId) {
        setGameState(msg.state);
        if (msg.marks) setMarks(msg.marks);
      }
      if (msg.type === 'game_created' && msg.gameId === gameId) {
        setGameState(msg.game_state);
        setMarks(msg.marks);
      }
      if (msg.type === 'room_state') {
        if (msg.you) setYou(msg.you);
        setRoomState(msg);
      }
    },
    onError(e: Event) { console.error('[GamePage] error', e); },
    onClose() { console.warn('[GamePage] closed'); }
  } as any);
  useEffect(() => {}, [ws]);

  const effectiveYou = you || playerId; // fall back to our stored id until room_state arrives
  const myMark = effectiveYou && marks ? marks[effectiveYou] : undefined;
  const canPlay = !!(myMark && gameState && gameState.currentPlayer === myMark);
  const sendMove = (miniBoardIndex: number, cellIndex: number) => ws?.send(JSON.stringify({ type: 'move', gameId, miniBoardIndex, cellIndex }));
  const requestUndo = () => ws?.send(JSON.stringify({ type: 'request', action: 'undo', gameId }));
  const requestRedo = () => ws?.send(JSON.stringify({ type: 'request', action: 'redo', gameId }));
  const requestNew = (mark: 'X'|'O') => ws?.send(JSON.stringify({ type: 'request', action: 'new', desiredMark: mark }));
  const respond = (accepted: boolean) => {
    const pending = roomState?.pending;
    if (!pending) return;
    if (pending.type === 'new') ws?.send(JSON.stringify({ type: 'response', action: 'new', accepted }));
    else ws?.send(JSON.stringify({ type: 'response', action: pending.type, accepted, gameId: pending.gameId }));
  };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Room {roomId} - Game {gameId}</h1>
      <div className="mt-2 text-sm">
        {myMark ? (
          <span>You are {myMark}. {canPlay ? 'Your turn.' : 'Opponent’s turn.'}</span>
        ) : (
          <span>Connecting…</span>
        )}
      </div>
      {roomState?.scores && (
        <div className="mt-2 text-sm">Score X:{roomState.scores.X} O:{roomState.scores.O}</div>
      )}
      <div className="mt-4">
        <UltimateTicTacToe
          mode="online"
          onlineState={gameState}
          myMark={myMark as any}
          canPlay={canPlay}
          onMove={sendMove}
          onRequestNew={requestNew}
          onRequestUndo={requestUndo}
          onRequestRedo={requestRedo}
          pending={roomState?.pending ? {
            type: roomState.pending.type,
            desiredMark: roomState.pending.desiredMark,
            fromIsMe: roomState.pending.from === you,
          } : undefined}
          onRespond={respond}
        />
      </div>
  {/* Pending UI moved into board modal */}
    </div>
  );
}
