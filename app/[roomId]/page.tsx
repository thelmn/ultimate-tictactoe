"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import usePartySocket from 'partysocket/react';

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;
  const [state, setState] = useState<any>({});
  const [you, setYou] = useState<string | null>(null);
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
      console.log('[RoomPage] connected', { host, party, roomId });
      const pid = typeof window !== 'undefined' ? (localStorage.getItem('utt-player-id') || playerId) : playerId;
      ws?.send(JSON.stringify({ type: 'join', roomId, playerId: pid }));
    },
    onMessage(e: MessageEvent) {
      let msg: any; try { msg = JSON.parse((e as any).data); } catch { return; }
      console.log('[RoomPage] message', msg);
      if (msg.type === 'room_state') {
        setState(msg);
        if (msg.you) setYou(msg.you);
      } else if (msg.type === 'game_created') {
        router.push(`/${roomId}/${msg.gameId}`);
      }
    },
    onError(e: Event) { console.error('[RoomPage] error', e); },
    onClose() { console.warn('[RoomPage] closed'); }
  } as any);

  useEffect(() => {}, [ws]);

  const canStart = (state.players?.length || 0) === 2;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Room {roomId}</h1>
  <div className="mt-4">Players: {state.players?.length || 0}/2</div>
  {you && (<div className="text-sm text-gray-600">You: {you}</div>)}
      {state.players?.length > 2 && (
        <div className="text-red-600">Room full</div>
      )}
      <div className="mt-6 space-x-2">
        <button
          disabled={!canStart}
          onClick={() => ws?.send(JSON.stringify({ type: 'request', action: 'new', desiredMark: 'X' }))}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >Request New Game as X</button>
        <button
          disabled={!canStart}
          onClick={() => ws?.send(JSON.stringify({ type: 'request', action: 'new', desiredMark: 'O' }))}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >Request New Game as O</button>
      </div>
      {state.pending?.type === 'new' && (
        <div className="mt-4 p-3 border rounded">
          {state.pending.from === you ? (
            <div className="flex items-center gap-2">
              <span>Awaiting opponent response…</span>
              <button className="px-3 py-1 bg-gray-500 text-white rounded" onClick={() => ws?.send(JSON.stringify({ type: 'response', action: 'new', accepted: false }))}>Cancel</button>
            </div>
          ) : (
            <>
              <div>Incoming new game request: opponent wants {state.pending.desiredMark}</div>
              <div className="mt-2 space-x-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => ws?.send(JSON.stringify({ type: 'response', action: 'new', accepted: true }))}>Accept</button>
                <button className="px-3 py-1 bg-gray-400 text-white rounded" onClick={() => ws?.send(JSON.stringify({ type: 'response', action: 'new', accepted: false }))}>Decline</button>
              </div>
            </>
          )}
        </div>
      )}
  {state.currentGameId && (
        <div className="mt-4">
          <button className="underline" onClick={() => router.push(`/${roomId}/${state.currentGameId}`)}>Go to current game</button>
        </div>
      )}
    </div>
  );
}
