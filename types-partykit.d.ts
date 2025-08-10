declare module 'partykit/server' {
  export type Connection = { id: string; send: (data: string) => void; close: () => void };
  export type Party = {
    id: string;
    broadcast: (data: string) => void;
  } & { Server: any; FetchHandler: any };
}
