import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { Readable } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Client, GatewayIntentBits, ChannelType, type VoiceBasedChannel } from 'discord.js';
import { PlayerManager, type Player } from 'ziplayer';
import { YouTubePlugin, SoundCloudPlugin, SpotifyPlugin, TTSPlugin } from '@ziplayer/plugin';
import { voiceExt } from '@ziplayer/extension';

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

// HTTP Endpoint for ZiPlayer Stream Preview (search -> save -> Readable stream piped to res)
let globalStreamManager: PlayerManager | null = null;
function getGlobalStreamManager(): PlayerManager {
  if (!globalStreamManager) {
    globalStreamManager = new PlayerManager({
      plugins: [new YouTubePlugin({}), new SoundCloudPlugin(), new SpotifyPlugin(), new TTSPlugin({ defaultLang: 'vi' })],
    });
  }
  return globalStreamManager;
}

app.get(['/api/ziplayer/stream', '/api/ziplayer/proxy-stream'], async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string) || (req.query.url as string) || (req.query.audioUrl as string);
    if (!query) {
      res.status(400).send('Missing query or url parameter');
      return;
    }

    console.log(`[ZiPlayer Stream] Processing stream request for: "${query}"`);
    const manager = getGlobalStreamManager();

    // 1. Try resolving via ZiPlayer plugins (YouTube, SoundCloud, Spotify, etc.)
    try {
      const searchResult = await manager.search(query, 'web_user');

      if (searchResult && searchResult.tracks && searchResult.tracks.length > 0) {
        const track = searchResult.tracks[0];
        console.log(`[ZiPlayer Stream] Extracting Readable stream for: "${track.title}" via player.save`);

        const player = await manager.create('http_stream_preview');
        const stream = await player.save(track);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        stream.pipe(res);

        stream.on('error', (streamErr) => {
          console.error('[ZiPlayer Readable Stream Pipe Error]:', streamErr);
          if (!res.headersSent) {
            res.status(500).send('Audio stream piping error');
          }
        });
        return;
      }
    } catch (searchErr: any) {
      console.log(`[ZiPlayer Stream] Plugin search did not match: ${searchErr?.message || searchErr}`);
    }

    // 2. Direct HTTP/HTTPS audio URL fallback (proxies direct audio files cleanly)
    if (query.startsWith('http://') || query.startsWith('https://')) {
      console.log(`[ZiPlayer Stream] Direct audio URL fallback for: ${query}`);
      const response = await fetch(query, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok || !response.body) {
        res.status(response.status).send('Failed to fetch direct audio stream');
        return;
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');

      const nodeReadable = Readable.fromWeb(response.body as any);
      nodeReadable.pipe(res);
      return;
    }

    res.status(404).send('No track found for query');
  } catch (err: any) {
    console.error('[ZiPlayer HTTP Stream Endpoint Error]:', err);
    if (!res.headersSent) {
      res.status(500).send(err.message || 'Error processing ZiPlayer stream');
    }
  }
});

// ============================================================================
// 12. REAL ZiPlayer Integration (discord.js + @discordjs/voice + ziplayer)
// ----------------------------------------------------------------------------
// Music no longer gets proxied to the browser as an HTTP audio stream. The
// bot uses a real discord.js voice connection to join the voice channel and
// ziplayer streams the resolved audio (YouTube / SoundCloud / Spotify / TTS)
// directly into Discord, exactly like a normal music bot. Voice receiver
// (speech-to-text on what members say in the channel) is provided by
// @ziplayer/extension's voiceExt and forwarded to the frontend live.
// ============================================================================

// HTTP Server creation
const server = http.createServer(app);

// WebSocket Server for Real-Time Discord Gateway Bridge
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  clientWs: WebSocket;
  discordClient?: Client;
  playerManager?: PlayerManager;
  token?: string;
  pingMs?: number;
  pingInterval?: NodeJS.Timeout;
}

const activeSessions = new Map<WebSocket, ClientSession>();

function safeSend(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// Build one ziplayer PlayerManager per session/bot connection. Plugins cover
// YouTube / SoundCloud / Spotify search+stream resolution and TTS; voiceExt
// gives us the real voice receiver (speech-to-text on members in the call).
function createPlayerManager(session: ClientSession): PlayerManager {
  const manager = new PlayerManager({
    plugins: [new YouTubePlugin({}), new SoundCloudPlugin(), new SpotifyPlugin(), new TTSPlugin({ defaultLang: 'vi' })],
    extensions: [
      // new voiceExt(null, {
      //   lang: 'vi-VN',
      //   minimalVoiceMessageDuration: 1,
      //   postSilenceDelayMs: 1500,
      // }),
    ],
    extractorTimeout: 30000,
    autoCleanup: true,
  });

  // Playback lifecycle -> forwarded to the frontend so the UI can reflect the
  // REAL state of the bot's player instead of the previous local <audio> fake.
  manager.on('trackStart', (player: Player, track: any) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'trackStart', guildId: player.guildId, track });
  });
  manager.on('trackEnd', (player: Player, track: any) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'trackEnd', guildId: player.guildId, track });
  });
  manager.on('queueEnd', (player: Player) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'queueEnd', guildId: player.guildId });
  });
  manager.on('playerPause', (player: Player) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'playerPause', guildId: player.guildId });
  });
  manager.on('playerResume', (player: Player) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'playerResume', guildId: player.guildId });
  });
  manager.on('volumeChange', (player: Player, oldVolume: number, newVolume: number) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'volumeChange', guildId: player.guildId, oldVolume, newVolume });
  });
  manager.on('queueAdd', (player: Player, track: any) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'queueAdd', guildId: player.guildId, track });
  });
  manager.on('playerDestroy', (player: Player) => {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'playerDestroy', guildId: player.guildId });
  });
  manager.on('playerError', (player: Player, error: Error, track?: any) => {
    console.error('[ZiPlayer] playerError:', error);
    safeSend(session.clientWs, {
      type: 'PLAYER_EVENT',
      event: 'playerError',
      guildId: player.guildId,
      error: error.message,
      track,
    });
  });

  // Real voice receiver: fired by voiceExt whenever a member's speech has
  // been transcribed to text (Speech-to-Text), while the bot is in a channel.
  manager.on('voiceCreate', (player: Player, evt: any) => {
    safeSend(session.clientWs, {
      type: 'VOICE_RECEIVER_EVENT',
      guildId: player.guildId,
      userId: evt.userId,
      content: evt.content,
      raw: evt,
    });
  });

  manager.on('debug', (message: string) => {
    console.log('[ZiPlayer debug]', message);
  });

  return manager;
}

wss.on('connection', (clientWs: WebSocket) => {
  console.log('[WS] Frontend client connected to WebSocket gateway bridge');
  const session: ClientSession = { clientWs };
  activeSessions.set(clientWs, session);

  clientWs.on('message', async (rawMsg: string) => {
    try {
      const data = JSON.parse(rawMsg.toString());

      switch (data.type) {
        case 'CONNECT_BOT': {
          const { token } = data;
          if (!token) return;
          session.token = token;
          connectDiscordBot(session, token);
          break;
        }

        case 'DISCONNECT_BOT': {
          await cleanupDiscordConnection(session);
          break;
        }

        case 'JOIN_VOICE': {
          const { guildId, channelId, selfMute = false, selfDeaf = false } = data;
          await handleJoinVoice(session, guildId, channelId, selfMute, selfDeaf);
          break;
        }

        case 'LEAVE_VOICE': {
          const { guildId } = data;
          await handleLeaveVoice(session, guildId);
          break;
        }

        // Real playback control, replacing the previous fake <audio> tag flow.
        case 'PLAYER_PLAY': {
          const { guildId, channelId, query, userId, selfMute = false, selfDeaf = true } = data;
          await handlePlayerPlay(session, guildId, channelId, query, userId, selfMute, selfDeaf);
          break;
        }

        case 'PLAYER_CONTROL': {
          const { guildId, action, value } = data;
          handlePlayerControl(session, guildId, action, value);
          break;
        }

        case 'PING': {
          clientWs.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;
        }
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

async function cleanupDiscordConnection(session: ClientSession) {
  if (session.pingInterval) {
    clearInterval(session.pingInterval);
    session.pingInterval = undefined;
  }
  if (session.playerManager) {
    try {
      // Destroy every guild player (leaves voice channels, frees ffmpeg/opus resources)
      for (const player of session.playerManager.getAll?.() ?? []) {
        try {
          player.destroy();
        } catch {}
      }
    } catch {}
    session.playerManager = undefined;
  }
  if (session.discordClient) {
    try {
      await session.discordClient.destroy();
    } catch {}
    session.discordClient = undefined;
  }
}

function connectDiscordBot(session: ClientSession, rawToken: string) {
  cleanupDiscordConnection(session);

  const token = rawToken.trim().replace(/^Bot\s+/i, '');

  console.log('[Discord] Connecting real discord.js Client...');
  safeSend(session.clientWs, {
    type: 'GATEWAY_STATUS',
    status: 'CONNECTING',
    message: 'Đang kết nối tới Discord Gateway (discord.js Client thật)...',
  });

  const client = new Client({
    // Unprivileged intents only (mirrors previous bitmask 5761), so bots
    // without Message Content / Guild Members enabled in the dev portal
    // still connect fine. GuildVoiceStates is required for real voice join.
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages,
    ],
  });
  session.discordClient = client;
  session.playerManager = createPlayerManager(session);

  // Forward raw Gateway dispatch packets 1:1 in the same shape the frontend
  // already understands (raw Discord API JSON), so App.tsx's existing
  // handleDiscordGatewayEvent() keeps working unmodified, while discord.js
  // now handles connecting/resuming/heartbeats/voice-adapter for real.
  client.on('raw', (packet: any) => {
    if (!packet || packet.op !== 0) return;
    safeSend(session.clientWs, { type: 'DISCORD_EVENT', eventName: packet.t, data: packet.d });
  });

  client.once('ready', () => {
    const user = client.user;
    console.log(`[Discord] READY! Bot tagged as ${user?.tag}`);
    safeSend(session.clientWs, {
      type: 'GATEWAY_STATUS',
      status: 'CONNECTED',
      botUser: user
        ? {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator || '0000',
            avatar: user.avatar,
            global_name: user.globalName || user.username,
            bot: true,
          }
        : null,
    });

    // Real gateway ping, sampled periodically (replaces the manual heartbeat math).
    session.pingInterval = setInterval(() => {
      const ping = client.ws.ping;
      if (typeof ping === 'number' && ping >= 0) {
        session.pingMs = ping;
        safeSend(session.clientWs, { type: 'GATEWAY_PING', pingMs: ping });
      }
    }, 10000);
  });

  client.on('error', (err: any) => {
    console.error('[Discord Client] Error:', err);
    safeSend(session.clientWs, {
      type: 'GATEWAY_STATUS',
      status: 'ERROR',
      error: err?.message || 'Discord Client Error',
    });
  });

  client.on('shardDisconnect', (event: any, id: number) => {
    let errorMessage = `Ngắt kết nối từ Gateway (Shard ${id}, mã ${event?.code})`;
    if (event?.code === 4014) {
      errorMessage = 'Lỗi 4014: Disallowed Intent(s) - Token yêu cầu Intent nâng cao chưa được bật trong Discord Developer Portal.';
    } else if (event?.code === 4004) {
      errorMessage = 'Lỗi 4004: Authentication Failed - Bot Token không hợp lệ.';
    }
    console.log(`[Discord] Shard ${id} disconnected: ${event?.code}`);
    safeSend(session.clientWs, { type: 'GATEWAY_STATUS', status: 'DISCONNECTED', error: errorMessage });
  });

  client.login(token).catch((err: any) => {
    console.error('[Discord] Login failed:', err);
    let errorMessage = err?.message || 'Đăng nhập thất bại';
    if (/disallowed intents/i.test(errorMessage)) {
      errorMessage = 'Lỗi 4014: Disallowed Intent(s) - Bật Privileged Gateway Intents nếu cần, hoặc kiểm tra lại cấu hình bot.';
    } else if (/token/i.test(errorMessage)) {
      errorMessage = 'Token không hợp lệ. Vui lòng kiểm tra lại Bot Token.';
    }
    safeSend(session.clientWs, { type: 'GATEWAY_STATUS', status: 'ERROR', error: errorMessage });
  });
}

// Resolve a real, real voice-joinable channel from the live discord.js cache.
async function resolveVoiceChannel(
  session: ClientSession,
  guildId: string,
  channelId: string
): Promise<VoiceBasedChannel> {
  if (!session.discordClient) throw new Error('Bot chưa kết nối Discord Gateway');
  const guild = await session.discordClient.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(channelId);
  if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
    throw new Error('Kênh mục tiêu không phải là kênh thoại hợp lệ');
  }
  return channel as VoiceBasedChannel;
}

// JOIN_VOICE now performs a REAL @discordjs/voice join (full UDP/RTP
// handshake handled by ziplayer's connect()), instead of only sending a raw
// Opcode 4 packet with no follow-up.
async function handleJoinVoice(
  session: ClientSession,
  guildId: string,
  channelId: string,
  selfMute: boolean,
  selfDeaf: boolean
) {
  try {
    if (!session.discordClient || !session.playerManager) {
      throw new Error('Bot chưa kết nối Discord Gateway');
    }
    const channel = await resolveVoiceChannel(session, guildId, channelId);
    const player = await session.playerManager.create(guildId, {
      leaveOnEnd: false,
      selfDeaf,
      selfMute,
    } as any);
    await player.connect(channel);

    console.log(`[ZiPlayer] Real voice connection established: guild=${guildId}, channel=${channelId}`);
    safeSend(session.clientWs, {
      type: 'GATEWAY_VOICE_LOG',
      status: 'SENT_JOIN',
      guildId,
      channelId,
      message: `Đã kết nối THẬT vào kênh thoại ${channelId} bằng ziplayer (player.connect).`,
    });
  } catch (err: any) {
    console.error('[ZiPlayer] JOIN_VOICE failed:', err);
    safeSend(session.clientWs, {
      type: 'GATEWAY_VOICE_LOG',
      status: 'ERROR',
      guildId,
      channelId,
      message: `Không thể kết nối kênh thoại: ${err?.message || err}`,
    });
  }
}

async function handleLeaveVoice(session: ClientSession, guildId: string) {
  try {
    const player = session.playerManager?.get(guildId);
    if (player) {
      player.destroy();
    }
    safeSend(session.clientWs, {
      type: 'GATEWAY_VOICE_LOG',
      status: 'SENT_LEAVE',
      guildId,
      channelId: null,
      message: `Đã rời kênh thoại thật cho guild ${guildId}.`,
    });
  } catch (err: any) {
    console.warn('[ZiPlayer] LEAVE_VOICE failed:', err?.message || err);
  }
}

// PLAYER_PLAY: real ziplayer playback. Connects (if needed) then resolves +
// streams the query (URL or search text) straight into the Discord voice
// channel — this is the actual replacement for the old fake HTML5 stream.
async function handlePlayerPlay(
  session: ClientSession,
  guildId: string,
  channelId: string | undefined,
  query: string,
  userId: string,
  selfMute: boolean,
  selfDeaf: boolean
) {
  try {
    if (!session.discordClient || !session.playerManager) {
      throw new Error('Bot chưa kết nối Discord Gateway');
    }
    let player = session.playerManager.get(guildId);
    if (!player) {
      player = await session.playerManager.create(guildId, { leaveOnEnd: false, selfDeaf, selfMute } as any);
    }
    if (!player.connection && channelId) {
      const channel = await resolveVoiceChannel(session, guildId, channelId);
      await player.connect(channel);
    }
    if (!player.connection) {
      throw new Error('Bot chưa ở trong kênh thoại nào, không thể phát nhạc');
    }

    console.log(`[ZiPlayer] play("${query}") requested by ${userId} in guild ${guildId}`);
    const ok = await player.play(query, userId);
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'playRequested', guildId, ok, query });
  } catch (err: any) {
    console.error('[ZiPlayer] PLAYER_PLAY failed:', err);
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'playerError', guildId, error: err?.message || String(err) });
  }
}

function handlePlayerControl(session: ClientSession, guildId: string, action: string, value?: any) {
  const player = session.playerManager?.get(guildId);
  if (!player) {
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'playerError', guildId, error: 'Không có player đang hoạt động cho guild này' });
    return;
  }
  try {
    switch (action) {
      case 'pause':
        player.pause();
        break;
      case 'resume':
        player.resume();
        break;
      case 'skip':
        player.skip();
        break;
      case 'stop':
        player.stop();
        break;
      case 'volume':
        player.setVolume(Number(value));
        break;
      case 'loop':
        player.loop(value);
        break;
      case 'shuffle':
        player.shuffle();
        break;
      case 'previous':
        player.previous();
        break;
      default:
        console.warn('[ZiPlayer] Unknown PLAYER_CONTROL action:', action);
    }
  } catch (err: any) {
    console.error(`[ZiPlayer] PLAYER_CONTROL(${action}) failed:`, err);
    safeSend(session.clientWs, { type: 'PLAYER_EVENT', event: 'playerError', guildId, error: err?.message || String(err) });
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