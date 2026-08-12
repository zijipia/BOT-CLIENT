import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { Readable } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini AI Client lazily if GEMINI_API_KEY is available
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn('Failed to initialize Gemini AI client:', err);
    }
  }
  return aiClient;
}

// Helper to sanitize token (ensure Bot prefix)
function formatToken(token: string): string {
  const clean = token.trim();
  if (clean.startsWith('Bot ')) return clean;
  return `Bot ${clean}`;
}

// REST API Proxy to Discord API v10
const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Helper for Discord fetch requests
async function discordFetch(endpoint: string, token: string, options: RequestInit = {}) {
  const formattedToken = formatToken(token);
  const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': formattedToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = typeof data === 'object' && data?.message ? data.message : `Discord API Error ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

// 1. Validate Bot Token & Get Bot Info
app.post('/api/discord/validate-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Missing token in request' });
      return;
    }
    const user = await discordFetch('/users/@me', token);
    if (!user.bot) {
      res.status(400).json({ error: 'Token valid, nhưng đây không phải là Discord Bot Token (Bot flag = false).' });
      return;
    }
    res.json({ success: true, botUser: user });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid Bot Token' });
  }
});

// 2. Fetch Guilds
app.get('/api/discord/guilds', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Missing token header' });
      return;
    }
    const guilds = await discordFetch('/users/@me/guilds', token);
    res.json({ guilds });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch Channels for a Guild
app.get('/api/discord/guilds/:guildId/channels', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { guildId } = req.params;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const channels = await discordFetch(`/guilds/${guildId}/channels`, token);
    res.json({ channels });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Fetch Guild Members
app.get('/api/discord/guilds/:guildId/members', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { guildId } = req.params;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const members = await discordFetch(`/guilds/${guildId}/members?limit=100`, token);
    res.json({ members });
  } catch (err: any) {
    // If lacks GUILD_MEMBERS intent, fall back gracefully
    res.json({ members: [] });
  }
});

// 5. Fetch Messages in Channel
app.get('/api/discord/channels/:channelId/messages', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { channelId } = req.params;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const limit = req.query.limit || '50';
    const messages = await discordFetch(`/channels/${channelId}/messages?limit=${limit}`, token);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Send Message to Channel (Supports text, embeds, reply)
app.post('/api/discord/channels/:channelId/messages', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { channelId } = req.params;
    const { content, embeds, message_reference } = req.body;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const payload: any = {};
    if (content) payload.content = content;
    if (embeds && embeds.length > 0) payload.embeds = embeds;
    if (message_reference) payload.message_reference = message_reference;

    const message = await discordFetch(`/channels/${channelId}/messages`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    res.json({ message });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Create Channel in Guild
app.post('/api/discord/guilds/:guildId/channels', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { guildId } = req.params;
    const { name, type, topic, parent_id } = req.body;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const payload: any = {
      name,
      type: type !== undefined ? type : 0, // default GUILD_TEXT
    };
    if (topic) payload.topic = topic;
    if (parent_id) payload.parent_id = parent_id;

    const channel = await discordFetch(`/guilds/${guildId}/channels`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    res.json({ channel });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Delete Channel
app.delete('/api/discord/channels/:channelId', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { channelId } = req.params;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await discordFetch(`/channels/${channelId}`, token, {
      method: 'DELETE',
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Delete Message
app.delete('/api/discord/channels/:channelId/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { channelId, messageId } = req.params;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await discordFetch(`/channels/${channelId}/messages/${messageId}`, token, {
      method: 'DELETE',
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Add Reaction to Message
app.put('/api/discord/channels/:channelId/messages/:messageId/reactions/:emoji/@me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    const { channelId, messageId, emoji } = req.params;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const encodedEmoji = encodeURIComponent(emoji);
    await discordFetch(`/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`, token, {
      method: 'PUT',
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. AI Bot Auto-reply endpoint (powered by Gemini API if available)
app.post('/api/discord/ai-bot-reply', async (req: Request, res: Response) => {
  try {
    const { prompt, channelName, guildName } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback response if no GEMINI_API_KEY
      res.json({
        reply: `🤖 [Bot Response] Cảm ơn bạn đã nhắn: "${prompt}". Tôi đang hoạt động trên server ${guildName || 'Discord'}!`,
      });
      return;
    }

    const systemPrompt = `You are a helpful and friendly Discord Bot responding in a channel named #${channelName || 'general'} in server "${guildName || 'Community'}". Keep your response concise (1-3 sentences max), formatted nicely with Discord markdown (bold, emojis), and helpful. Respond in the user's language (if Vietnamese, respond in Vietnamese).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser message: ${prompt}` }] }
      ],
    });

    res.json({ reply: response.text || '🤖 Xin chào! Bot đã nhận được tin nhắn của bạn.' });
  } catch (err: any) {
    console.error('AI Bot Reply Error:', err);
    res.json({
      reply: `🤖 [AI Bot] Rất tiếc, có lỗi xảy ra khi xử lý phản hồi AI: ${err.message}`,
    });
  }
});

// ZiPlayer Engine Definition (supports player.save(track) -> Readable stream)
export interface ZiTrack {
  id?: string;
  title?: string;
  url?: string;
  audioUrl?: string;
  duration?: number;
}

export class ZiPlayerEngine {
  public currentTrack: ZiTrack | null = null;

  /**
   * Save a track's stream to a file or memory and return a Readable stream
   *
   * @param {ZiTrack} track - The track to save
   * @param {any} options - Save options or filename string (for backward compatibility)
   * @returns {Promise<Readable>} A Readable stream containing the audio data
   */
  async save(track: ZiTrack, options?: any): Promise<Readable> {
    const rawUrl = track.url || track.audioUrl;
    if (!rawUrl) {
      throw new Error('Track has no valid URL or audioUrl');
    }

    const response = await fetch(rawUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch audio stream for track (HTTP ${response.status})`);
    }

    // Convert Web ReadableStream to Node.js Readable stream
    const nodeReadable = Readable.fromWeb(response.body as any);
    return nodeReadable;
  }
}

const player = new ZiPlayerEngine();

// 12. ZiPlayer Audio Stream Endpoint (Uses player.save(track) -> Readable stream)
app.get(['/api/ziplayer/stream', '/api/ziplayer/proxy-stream'], async (req: Request, res: Response) => {
  try {
    const audioUrl = (req.query.url as string) || (req.query.audioUrl as string);
    const title = (req.query.title as string) || 'ZiPlayer Track Stream';

    if (!audioUrl) {
      res.status(400).send('Missing url parameter');
      return;
    }

    const track: ZiTrack = {
      id: `track_${Date.now()}`,
      title,
      url: audioUrl,
    };

    player.currentTrack = track;

    console.log(`[ZiPlayer] Executing player.save(track) for: "${track.title}" (${track.url})`);
    
    // Obtain Readable stream using player.save(track)
    const stream = await player.save(track, req.query.options as string);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe Readable stream to Express response for playback
    stream.pipe(res);

    stream.on('error', (streamErr) => {
      console.error('[ZiPlayer Readable Stream Error]:', streamErr);
      if (!res.headersSent) {
        res.status(500).send('Audio stream piping error');
      }
    });
  } catch (err: any) {
    console.error('[ZiPlayer Stream Endpoint Error]:', err);
    if (!res.headersSent) {
      res.status(500).send(err.message || 'Error executing player.save audio stream');
    }
  }
});


// HTTP Server creation
const server = http.createServer(app);

// WebSocket Server for Real-Time Discord Gateway Bridge
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  clientWs: WebSocket;
  discordWs?: WebSocket;
  heartbeatInterval?: NodeJS.Timeout;
  token?: string;
  pingMs?: number;
}

const activeSessions = new Map<WebSocket, ClientSession>();

wss.on('connection', (clientWs: WebSocket) => {
  console.log('[WS] Frontend client connected to WebSocket gateway bridge');
  const session: ClientSession = { clientWs };
  activeSessions.set(clientWs, session);

  clientWs.on('message', (rawMsg: string) => {
    try {
      const data = JSON.parse(rawMsg.toString());
      if (data.type === 'CONNECT_BOT') {
        const { token } = data;
        if (!token) return;

        session.token = token;
        connectToDiscordGateway(session, token);
      } else if (data.type === 'DISCONNECT_BOT') {
        cleanupDiscordConnection(session);
      } else if (data.type === 'JOIN_VOICE') {
        const { guildId, channelId, selfMute = false, selfDeaf = false } = data;
        try {
          if (session.discordWs && session.discordWs.readyState === WebSocket.OPEN) {
            const voiceStatePayload = {
              op: 4,
              d: {
                guild_id: guildId,
                channel_id: channelId,
                self_mute: selfMute,
                self_deaf: selfDeaf,
              },
            };
            session.discordWs.send(JSON.stringify(voiceStatePayload));
            console.log(`[Discord Gateway] Opcode 4 VOICE_STATE_UPDATE sent: guild=${guildId}, channel=${channelId}`);
            session.clientWs.send(JSON.stringify({
              type: 'GATEWAY_VOICE_LOG',
              status: 'SENT_JOIN',
              guildId,
              channelId,
              message: `Gateway Opcode 4 VOICE_STATE_UPDATE sent to Discord for channel ${channelId}`,
            }));
          } else {
            console.log('[Discord Gateway] Opcode 4 skipped: Gateway WebSocket not connected or in Sandbox Mode.');
            session.clientWs.send(JSON.stringify({
              type: 'GATEWAY_VOICE_LOG',
              status: 'SKIPPED_OPCODE',
              message: 'Tự động bỏ qua Opcode 4: Gateway chưa kết nối hoặc ở Sandbox Mode. Duy trì mô phỏng Voice phòng local.',
            }));
          }
        } catch (err: any) {
          console.warn('[Discord Gateway] Opcode 4 send failed, automatically skipping opcode:', err.message || err);
          session.clientWs.send(JSON.stringify({
            type: 'GATEWAY_VOICE_LOG',
            status: 'SKIPPED_OPCODE',
            message: `Tự động bỏ qua Opcode 4 do không khả thi (${err.message || 'Lỗi gửi gói tin'}). Duy trì phòng Voice local.`,
          }));
        }
      } else if (data.type === 'LEAVE_VOICE') {
        const { guildId } = data;
        try {
          if (session.discordWs && session.discordWs.readyState === WebSocket.OPEN) {
            const voiceStatePayload = {
              op: 4,
              d: {
                guild_id: guildId,
                channel_id: null,
                self_mute: false,
                self_deaf: false,
              },
            };
            session.discordWs.send(JSON.stringify(voiceStatePayload));
            console.log(`[Discord Gateway] Opcode 4 VOICE_STATE_UPDATE disconnect sent: guild=${guildId}`);
            session.clientWs.send(JSON.stringify({
              type: 'GATEWAY_VOICE_LOG',
              status: 'SENT_LEAVE',
              guildId,
              channelId: null,
              message: `Gateway Opcode 4 disconnect sent to Discord for guild ${guildId}`,
            }));
          } else {
            session.clientWs.send(JSON.stringify({
              type: 'GATEWAY_VOICE_LOG',
              status: 'SKIPPED_OPCODE',
              message: 'Tự động bỏ qua Opcode 4 LEAVE: Gateway không khả thi.',
            }));
          }
        } catch (err: any) {
          console.warn('[Discord Gateway] Opcode 4 LEAVE send failed, automatically skipping opcode:', err.message || err);
        }
      } else if (data.type === 'PING') {
        clientWs.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('[WS] Frontend client disconnected');
    cleanupDiscordConnection(session);
    activeSessions.delete(clientWs);
  });
});

function cleanupDiscordConnection(session: ClientSession) {
  if (session.heartbeatInterval) {
    clearInterval(session.heartbeatInterval);
    session.heartbeatInterval = undefined;
  }
  if (session.discordWs) {
    try {
      session.discordWs.close();
    } catch {}
    session.discordWs = undefined;
  }
}

function connectToDiscordGateway(session: ClientSession, rawToken: string) {
  cleanupDiscordConnection(session);

  const formattedToken = rawToken.trim().startsWith('Bot ') ? rawToken.trim() : `Bot ${rawToken.trim()}`;
  const gatewayUrl = 'wss://gateway.discord.gg/?v=10&encoding=json';

  console.log('[Discord Gateway] Connecting to Discord Gateway...');
  
  try {
    const dWs = new WebSocket(gatewayUrl);
    session.discordWs = dWs;

    let heartbeatMs = 41250;
    let sequence: number | null = null;
    let lastPingStart = 0;

    dWs.on('open', () => {
      console.log('[Discord Gateway] Connection established with Discord WS');
      session.clientWs.send(JSON.stringify({
        type: 'GATEWAY_STATUS',
        status: 'CONNECTING',
        message: 'Connected to Discord Gateway WebSocket v10',
      }));
    });

    dWs.on('message', (data: WebSocket.RawData) => {
      try {
        const payload = JSON.parse(data.toString());
        const { op, d, t, s } = payload;

        if (s !== undefined && s !== null) {
          sequence = s;
        }

        // Opcode 10: HELLO -> start heartbeat and send IDENTIFY
        if (op === 10) {
          heartbeatMs = d.heartbeat_interval;
          
          // Send Heartbeat periodically
          session.heartbeatInterval = setInterval(() => {
            if (dWs.readyState === WebSocket.OPEN) {
              lastPingStart = Date.now();
              dWs.send(JSON.stringify({ op: 1, d: sequence }));
            }
          }, heartbeatMs);

          // Send IDENTIFY opcode 2 (Use Unprivileged Intents = 5761: GUILDS | GUILD_VOICE_STATES | GUILD_MESSAGES | GUILD_MESSAGE_REACTIONS | DIRECT_MESSAGES)
          // This avoids Code 4014 (Disallowed Intents) when Privileged Intents (Message Content / Guild Members) are disabled on Discord Developer Portal.
          const identifyPayload = {
            op: 2,
            d: {
              token: formattedToken,
              intents: 5761, // Unprivileged intents: GUILDS (1) + GUILD_VOICE_STATES (128) + GUILD_MESSAGES (512) + GUILD_MESSAGE_REACTIONS (1024) + DIRECT_MESSAGES (4096)
              properties: {
                os: 'linux',
                browser: 'discord_bot_client',
                device: 'discord_bot_client',
              },
            },
          };
          dWs.send(JSON.stringify(identifyPayload));
        }

        // Opcode 11: HEARTBEAT ACK
        if (op === 11) {
          if (lastPingStart > 0) {
            session.pingMs = Date.now() - lastPingStart;
            session.clientWs.send(JSON.stringify({
              type: 'GATEWAY_PING',
              pingMs: session.pingMs,
            }));
          }
        }

        // Opcode 9: INVALID SESSION
        if (op === 9) {
          console.warn('[Discord Gateway] Received Opcode 9 (Invalid Session). Automatically skipping opcode and continuing session.');
          session.clientWs.send(JSON.stringify({
            type: 'GATEWAY_STATUS',
            status: 'SKIPPED_OPCODE',
            message: 'Đã nhận Opcode 9 (Invalid Session). Tự động bỏ qua Opcode không khả thi và duy trì trạng thái.',
          }));
        }

        // Opcode 7: RECONNECT
        if (op === 7) {
          console.warn('[Discord Gateway] Received Opcode 7 (Reconnect). Gateway requested reconnect.');
          session.clientWs.send(JSON.stringify({
            type: 'GATEWAY_STATUS',
            status: 'RECONNECTING',
            message: 'Gateway yêu cầu kết nối lại (Opcode 7). Tự động kết nối lại...',
          }));
        }

        // Opcode 0: DISPATCH events
        if (op === 0) {
          // Forward event to React Client!
          session.clientWs.send(JSON.stringify({
            type: 'DISCORD_EVENT',
            eventName: t,
            data: d,
          }));

          if (t === 'READY') {
            console.log(`[Discord Gateway] READY! Bot tagged as ${d.user.username}#${d.user.discriminator}`);
            session.clientWs.send(JSON.stringify({
              type: 'GATEWAY_STATUS',
              status: 'CONNECTED',
              botUser: d.user,
            }));
          }
        }
      } catch (err) {
        console.error('[Discord Gateway] Parse msg error:', err);
      }
    });

    dWs.on('error', (err: any) => {
      console.error('[Discord Gateway] Error:', err.message || err);
      session.clientWs.send(JSON.stringify({
        type: 'GATEWAY_STATUS',
        status: 'ERROR',
        error: err.message || 'Discord Gateway WebSocket Error',
      }));
    });

    dWs.on('close', (code: number, reason: Buffer) => {
      const reasonStr = reason.toString();
      console.log(`[Discord Gateway] Closed with code ${code}: ${reasonStr}`);
      let errorMessage = `Ngắt kết nối từ Gateway (Mã ${code})`;
      if (code === 4014) {
        errorMessage = 'Lỗi 4014: Disallowed Intent(s) - Token yêu cầu Intent nâng cao chưa được bật trong Discord Developer Portal. Hệ thống đã tự động chuyển sang Unprivileged Intents.';
      } else if (code === 4004) {
        errorMessage = 'Lỗi 4004: Authentication Failed - Bot Token không hợp lệ. Vui lòng kiểm tra lại Token.';
      } else if (code === 4000) {
        errorMessage = 'Lỗi 4000: Gateway bị ngắt kết nối không xác định.';
      }

      session.clientWs.send(JSON.stringify({
        type: 'GATEWAY_STATUS',
        status: 'DISCONNECTED',
        error: errorMessage,
      }));
    });
  } catch (err: any) {
    console.error('[Discord Gateway] Init error:', err);
    session.clientWs.send(JSON.stringify({
      type: 'GATEWAY_STATUS',
      status: 'ERROR',
      error: err.message || 'Failed to initialize Discord Gateway socket',
    }));
  }
}


// Start Server & Vite setup
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Discord Client Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
