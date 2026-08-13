import { WebSocketServer, WebSocket } from 'ws';
import type http from 'node:http';
import url from 'node:url';
import { voiceStreamManagers } from './VoiceStreamManager';

export class VoiceWebSocketServer {
  private readonly wss: WebSocketServer;

  constructor(server: http.Server | WebSocketServer) {
    if (server instanceof WebSocketServer) {
      this.wss = server;
    } else {
      this.wss = new WebSocketServer({
        server,
        path: '/voice',
        perMessageDeflate: false,
      });
    }
    this.setup();
  }

  private setup() {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const parsedUrl = url.parse(req.url || '', true);
      const guildId = parsedUrl.query.guildId as string;

      if (!guildId) {
        console.warn('[VoiceWS] Client connected without guildId, closing.');
        ws.close(4000, 'guildId is required');
        return;
      }

      console.log(`[VoiceWS] Browser connected for guild: ${guildId}`);
      (ws as any).guildId = guildId;

      // Send currently active users
      const manager = voiceStreamManagers.get(guildId);
      if (manager) {
        ws.send(
          JSON.stringify({
            type: 'users',
            users: manager.users,
          })
        );
      }

      ws.on('close', () => {
        console.log(`[VoiceWS] Browser disconnected for guild: ${guildId}`);
      });
    });
  }

  public broadcastJSON(guildId: string, data: unknown) {
    const payload = JSON.stringify(data);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN && (client as any).guildId === guildId) {
        client.send(payload);
      }
    }
  }

  public broadcastPCM(guildId: string, userId: string, pcm: Buffer) {
    const packet = Buffer.allocUnsafe(8 + pcm.length);
    packet.writeBigUInt64BE(BigInt(userId), 0);
    pcm.copy(packet, 8);

    for (const client of this.wss.clients) {
      if (
        client.readyState === WebSocket.OPEN &&
        (client as any).guildId === guildId
      ) {
        if (client.bufferedAmount > 512 * 1024) {
          continue; // drop frames to guard against slow clients
        }
        client.send(packet, { binary: true });
      }
    }
  }

  public destroy() {
    this.wss.close();
  }
}
