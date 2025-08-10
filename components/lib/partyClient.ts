"use client";

// Lightweight PartyKit client wrapper using PartySocket
import PartySocket from 'partysocket';

type Handler = (msg: any) => void;

export class PartyClient {
  private ws?: WebSocket;
  private handlers: Set<Handler> = new Set();
  private roomId: string;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  connect() {
    // Determine host for PartyKit.
    // Prefer NEXT_PUBLIC_PARTYKIT_HOST, otherwise fall back to dev default 127.0.0.1:1999 if running locally,
    // otherwise same-origin host (useful if PartyKit is reverse-proxied in prod).
    let host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || '';
    if (!host && typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      host = isLocal ? '127.0.0.1:1999' : window.location.host;
      // eslint-disable-next-line no-console
      console.warn('[PartyClient] NEXT_PUBLIC_PARTYKIT_HOST not set; using', host);
    }
    const name = process.env.NEXT_PUBLIC_PARTYKIT_NAME || 'ultimate_tictactoe';
    const socket = new PartySocket({ host, room: this.roomId, party: name });
    // eslint-disable-next-line no-console
    console.log('[PartyClient] Using PartySocket', { host, party: name, room: this.roomId });
    socket.addEventListener('open', () => {
      // eslint-disable-next-line no-console
      console.log('[PartyClient] PartySocket open');
  let pid: string | null = null;
  try { pid = typeof window !== 'undefined' ? (localStorage.getItem('utt-player-id') || null) : null; } catch {}
  socket.send(JSON.stringify({ type: 'join', roomId: this.roomId, playerId: pid }));
      // eslint-disable-next-line no-console
      console.log('[PartyClient] Sent join');
    });
    socket.addEventListener('message', (ev: MessageEvent) => {
      let data: any;
      try { data = JSON.parse((ev as any).data); } catch { return; }
      // eslint-disable-next-line no-console
      console.log('[PartyClient] Message', data);
      this.handlers.forEach(h => h(data));
    });
    socket.addEventListener('error', (ev: Event) => {
      // eslint-disable-next-line no-console
      console.error('[PartyClient] PartySocket error', ev);
    });
    socket.addEventListener('close', (ev: CloseEvent) => {
      // eslint-disable-next-line no-console
      console.warn('[PartyClient] PartySocket closed', (ev as any).code, (ev as any).reason);
      setTimeout(() => this.connect(), 1000);
    });
    // Keep a WebSocket-like interface for send
    this.ws = socket as unknown as WebSocket;
  }

  send(msg: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // eslint-disable-next-line no-console
    console.log('[PartyClient] Send', msg);
    this.ws.send(JSON.stringify(msg));
  }

  on(handler: Handler) { this.handlers.add(handler); return () => this.handlers.delete(handler); }
}
