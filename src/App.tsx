import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
  DiscordUser,
  DiscordMember,
  BotStatusInfo,
  DiscordEmbed,
  ChannelType,
} from './types';
import { DEMO_BOT_USER, DEMO_GUILDS, INITIAL_MESSAGES } from './data/demoData';
import { GuildSidebar } from './components/GuildSidebar';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChatArea } from './components/ChatArea';
import { MemberList } from './components/MemberList';
import { TokenModal } from './components/TokenModal';
import { CreateChannelModal } from './components/CreateChannelModal';
import { EmbedBuilderModal } from './components/EmbedBuilderModal';
import { VoiceRoomOverlay } from './components/VoiceRoomOverlay';

export default function App() {
  // 1. Bot & Gateway Connection State
  const [botStatus, setBotStatus] = useState<BotStatusInfo>({
    connected: false,
    mode: 'demo',
    botUser: DEMO_BOT_USER,
    token: '',
    gatewayState: 'DISCONNECTED',
    pingMs: 24,
    activeGuildsCount: DEMO_GUILDS.length,
  });

  // 2. Data State
  const [guilds, setGuilds] = useState<DiscordGuild[]>(DEMO_GUILDS);
  const [activeGuildId, setActiveGuildId] = useState<string>('guild_1');
  const [activeChannelId, setActiveChannelId] = useState<string>('chan_3');
  const [messages, setMessages] = useState<Record<string, DiscordMessage[]>>(INITIAL_MESSAGES);
  const [members, setMembers] = useState<DiscordMember[]>(DEMO_GUILDS[0].members || []);

  // 3. UI Control Modals
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);

  // 4. Voice Channel State
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<DiscordChannel | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // 5. WebSocket Reference for Discord Gateway Bridge
  const wsRef = useRef<WebSocket | null>(null);

  // Real Discord Gateway Voice Confirmation States
  const [gatewayVoiceState, setGatewayVoiceState] = useState<{
    confirmed: boolean;
    channelId?: string | null;
    sessionId?: string;
    endpoint?: string;
    message?: string;
  }>({ confirmed: false });

  // Helper to send Voice Gateway Signal (Opcode 4)
  const sendVoiceGatewaySignal = useCallback(
    (channelId: string | null, guildId?: string) => {
      const targetGuild = guildId || activeGuildId;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (channelId) {
          wsRef.current.send(
            JSON.stringify({
              type: 'JOIN_VOICE',
              guildId: targetGuild,
              channelId,
              selfMute: isMuted,
              selfDeaf: isDeafened,
            })
          );
          console.log(`[Voice Gateway] Opcode 4 JOIN_VOICE sent: channel=${channelId}, guild=${targetGuild}`);
        } else {
          wsRef.current.send(
            JSON.stringify({
              type: 'LEAVE_VOICE',
              guildId: targetGuild,
            })
          );
          console.log(`[Voice Gateway] Opcode 4 LEAVE_VOICE sent: guild=${targetGuild}`);
        }
      }
    },
    [activeGuildId, isMuted, isDeafened]
  );

  const handleJoinVoiceChannel = (channel: DiscordChannel) => {
    setActiveVoiceChannel(channel);
    sendVoiceGatewaySignal(channel.id, channel.guild_id || activeGuildId);
  };

  const handleLeaveVoiceChannel = () => {
    if (activeVoiceChannel) {
      sendVoiceGatewaySignal(null, activeVoiceChannel.guild_id || activeGuildId);
    }
    setActiveVoiceChannel(null);
    setGatewayVoiceState({ confirmed: false });
  };

  // Active Guild and Channel computations
  const activeGuild = guilds.find((g) => g.id === activeGuildId) || guilds[0] || null;
  const activeChannel =
    activeGuild?.channels?.find((c) => c.id === activeChannelId) ||
    activeGuild?.channels?.[0] ||
    null;

  // Sync active guild members when switching servers
  useEffect(() => {
    if (activeGuild) {
      setMembers(activeGuild.members || []);
      // Auto-select first text channel if current activeChannel is not in guild
      const hasChannel = activeGuild.channels?.some((c) => c.id === activeChannelId);
      if (!hasChannel) {
        const firstTextChannel = activeGuild.channels?.find((c) => c.type === 0 || c.type === 5);
        if (firstTextChannel) {
          setActiveChannelId(firstTextChannel.id);
        }
      }
    }
  }, [activeGuildId, guilds]);

  // WebSocket Connection Handler
  const connectWebSocketGateway = useCallback((token: string) => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('[Frontend WS] Connecting to backend Gateway bridge:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Frontend WS] Connected to backend WS bridge');
      ws.send(JSON.stringify({ type: 'CONNECT_BOT', token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'GATEWAY_STATUS') {
          console.log('[Frontend WS] Gateway Status:', msg);
          if (msg.status === 'CONNECTED') {
            setBotStatus((prev) => ({
              ...prev,
              connected: true,
              mode: 'real',
              botUser: msg.botUser || prev.botUser,
              gatewayState: 'CONNECTED',
            }));
            // Fetch live guilds from Discord API
            fetchLiveGuilds(token);
          } else if (msg.status === 'ERROR') {
            setBotStatus((prev) => ({
              ...prev,
              connected: false,
              gatewayState: 'ERROR',
              error: msg.error,
            }));
          }
        } else if (msg.type === 'GATEWAY_PING') {
          setBotStatus((prev) => ({ ...prev, pingMs: msg.pingMs }));
        } else if (msg.type === 'GATEWAY_VOICE_LOG') {
          console.log('[Frontend Voice Log]', msg);
          if (msg.status === 'SKIPPED_OPCODE') {
            setGatewayVoiceState((prev) => ({
              ...prev,
              message: msg.message || 'Tự động bỏ qua Opcode không khả thi. Duy trì trạng thái Voice phòng.',
            }));
          }
        } else if (msg.type === 'DISCORD_EVENT') {
          handleDiscordGatewayEvent(msg.eventName, msg.data);
        }
      } catch (err) {
        console.error('[Frontend WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[Frontend WS] Disconnected');
    };
  }, []);

  // Fetch Live Guilds & Channels from Discord REST API
  const fetchLiveGuilds = async (token: string) => {
    try {
      const res = await fetch('/api/discord/guilds', {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (data.guilds && Array.isArray(data.guilds)) {
        // Fetch channels for each guild
        const loadedGuilds: DiscordGuild[] = await Promise.all(
          data.guilds.slice(0, 10).map(async (g: any) => {
            try {
              const chanRes = await fetch(`/api/discord/guilds/${g.id}/channels`, {
                headers: { Authorization: token },
              });
              const chanData = await chanRes.json();
              return {
                id: g.id,
                name: g.name,
                icon: g.icon
                  ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
                  : null,
                channels: chanData.channels || [],
                members: [],
              };
            } catch {
              return {
                id: g.id,
                name: g.name,
                channels: [],
              };
            }
          })
        );

        if (loadedGuilds.length > 0) {
          setGuilds(loadedGuilds);
          setActiveGuildId(loadedGuilds[0].id);
          if (loadedGuilds[0].channels?.[0]) {
            setActiveChannelId(loadedGuilds[0].channels[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch live guilds:', err);
    }
  };

  // Handle Real-time Gateway Events
  const handleDiscordGatewayEvent = (eventName: string, eventData: any) => {
    if (eventName === 'MESSAGE_CREATE') {
      const newMsg: DiscordMessage = {
        id: eventData.id,
        channel_id: eventData.channel_id,
        author: {
          id: eventData.author.id,
          username: eventData.author.username,
          discriminator: eventData.author.discriminator || '0000',
          avatar: eventData.author.avatar
            ? `https://cdn.discordapp.com/avatars/${eventData.author.id}/${eventData.author.avatar}.png`
            : null,
          bot: eventData.author.bot || false,
        },
        content: eventData.content,
        timestamp: eventData.timestamp,
        embeds: eventData.embeds,
        attachments: eventData.attachments,
        reactions: [],
      };

      setMessages((prev) => ({
        ...prev,
        [eventData.channel_id]: [...(prev[eventData.channel_id] || []), newMsg],
      }));
    } else if (eventName === 'CHANNEL_CREATE') {
      setGuilds((prev) =>
        prev.map((g) => {
          if (g.id === eventData.guild_id) {
            return {
              ...g,
              channels: [...(g.channels || []), eventData],
            };
          }
          return g;
        })
      );
    } else if (eventName === 'VOICE_STATE_UPDATE') {
      console.log('[Discord Gateway Event] VOICE_STATE_UPDATE:', eventData);
      if (botStatus.botUser && eventData.user_id === botStatus.botUser.id) {
        setGatewayVoiceState((prev) => ({
          ...prev,
          confirmed: !!eventData.channel_id,
          channelId: eventData.channel_id,
          sessionId: eventData.session_id,
          message: eventData.channel_id
            ? `Discord Gateway Voice State Confirmed! Session: ${eventData.session_id}`
            : 'Disconnected from Discord Voice Channel',
        }));
      }
    } else if (eventName === 'VOICE_SERVER_UPDATE') {
      console.log('[Discord Gateway Event] VOICE_SERVER_UPDATE:', eventData);
      setGatewayVoiceState((prev) => ({
        ...prev,
        endpoint: eventData.endpoint,
        message: `Voice RTC Server assigned: ${eventData.endpoint}`,
      }));
    }
  };

  // Switch to Real Token Mode
  const handleSaveToken = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/discord/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const botUser: DiscordUser = {
          id: data.botUser.id,
          username: data.botUser.username,
          discriminator: data.botUser.discriminator || '0001',
          global_name: data.botUser.global_name || data.botUser.username,
          avatar: data.botUser.avatar
            ? `https://cdn.discordapp.com/avatars/${data.botUser.id}/${data.botUser.avatar}.png`
            : null,
          bot: true,
          status: 'online',
        };

        setBotStatus({
          connected: true,
          mode: 'real',
          botUser,
          token,
          gatewayState: 'CONNECTING',
          pingMs: 30,
        });

        // Initiate WS Gateway Connection
        connectWebSocketGateway(token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Token validation error:', err);
      return false;
    }
  };

  // Switch to Demo Sandbox Mode
  const handleSwitchToDemoMode = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    setBotStatus({
      connected: true,
      mode: 'demo',
      botUser: DEMO_BOT_USER,
      token: '',
      gatewayState: 'CONNECTED',
      pingMs: 15,
      activeGuildsCount: DEMO_GUILDS.length,
    });

    setGuilds(DEMO_GUILDS);
    setActiveGuildId('guild_1');
    setActiveChannelId('chan_3');
  };

  // Send Message (Real API or Demo Simulation)
  const handleSendMessage = async (
    content: string,
    embed?: DiscordEmbed,
    replyToId?: string
  ) => {
    if (!activeChannelId) return;

    const currentChannelMessages = messages[activeChannelId] || [];
    const referencedMsg = replyToId
      ? currentChannelMessages.find((m) => m.id === replyToId)
      : undefined;

    if (botStatus.mode === 'real' && botStatus.token) {
      // Send message via real Discord REST API
      try {
        await fetch(`/api/discord/channels/${activeChannelId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: botStatus.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            embeds: embed ? [embed] : undefined,
            message_reference: replyToId ? { message_id: replyToId } : undefined,
          }),
        });
      } catch (err) {
        console.error('Failed to send real message:', err);
      }
    } else {
      // Demo Mode logic
      const newMsg: DiscordMessage = {
        id: `msg_${Date.now()}`,
        channel_id: activeChannelId,
        author: botStatus.botUser || DEMO_BOT_USER,
        content,
        timestamp: new Date().toISOString(),
        embeds: embed ? [embed] : undefined,
        referenced_message: referencedMsg,
        reactions: [],
      };

      setMessages((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
      }));

      // Trigger Interactive Bot Response in Demo Mode
      triggerDemoBotResponse(content, activeChannelId);
    }
  };

  // Interactive Bot Auto-Response in Demo Mode
  const triggerDemoBotResponse = (userPrompt: string, channelId: string) => {
    const trimmed = userPrompt.trim();

    setTimeout(async () => {
      let botReplyContent = '';
      let botReplyEmbed: DiscordEmbed | undefined = undefined;

      if (trimmed === '!ping') {
        botReplyContent = `🏓 **Pong!**\nLatency Gateway: \`${botStatus.pingMs || 18}ms\` | API REST: \`24ms\``;
      } else if (trimmed === '!info') {
        botReplyContent = '🤖 **Thông tin Bot Client Connection:**';
        botReplyEmbed = {
          title: 'Discord Bot Status Card',
          description: `Đang kết nối bằng **${botStatus.botUser?.username}**`,
          color: 0x5865f2,
          fields: [
            { name: 'Gateway State', value: '🟢 CONNECTED (v10)', inline: true },
            { name: 'Server Count', value: `${guilds.length} Servers`, inline: true },
            { name: 'Channel Active', value: `#${activeChannel?.name}`, inline: true },
          ],
          footer: { text: 'Discord Bot Manager Client' },
        };
      } else if (trimmed === '!roll') {
        const rand = Math.floor(Math.random() * 100) + 1;
        botReplyContent = `🎲 **${botStatus.botUser?.username}** vừa tung xắc xắc và đạt được: **${rand}/100** điểm!`;
      } else if (trimmed === '!embed') {
        botReplyEmbed = {
          title: '✨ Thẻ Embed Mẫu Tự Động',
          description: 'Thẻ Embed với tiêu đề, mô tả và khung màu sắc bắt mắt!',
          color: 0x57f287,
          fields: [
            { name: 'Tính năng 1', value: 'Chat Real-time WebSocket', inline: true },
            { name: 'Tính năng 2', value: 'Quản lý kênh & Server', inline: true },
          ],
        };
      } else if (trimmed.startsWith('!')) {
        botReplyContent = `🤖 Không tìm thấy lệnh \`${trimmed}\`. Hãy gõ \`!help\` để xem danh sách các câu lệnh hợp lệ!`;
      } else {
        // Call Gemini AI auto-reply for general chat!
        try {
          const res = await fetch('/api/discord/ai-bot-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: trimmed,
              channelName: activeChannel?.name,
              guildName: activeGuild?.name,
            }),
          });
          const data = await res.json();
          botReplyContent = data.reply || '🤖 Bot đã nhận được tin nhắn!';
        } catch {
          botReplyContent = `🤖 [Auto-Bot] Đã nhận tin nhắn: "${trimmed}" tại kênh #${activeChannel?.name}`;
        }
      }

      const botMsg: DiscordMessage = {
        id: `bot_msg_${Date.now()}`,
        channel_id: channelId,
        author: DEMO_BOT_USER,
        content: botReplyContent,
        timestamp: new Date().toISOString(),
        embeds: botReplyEmbed ? [botReplyEmbed] : undefined,
        reactions: [],
      };

      setMessages((prev) => ({
        ...prev,
        [channelId]: [...(prev[channelId] || []), botMsg],
      }));
    }, 600);
  };

  // Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChannelId) return;

    if (botStatus.mode === 'real' && botStatus.token) {
      try {
        await fetch(`/api/discord/channels/${activeChannelId}/messages/${messageId}`, {
          method: 'DELETE',
          headers: { Authorization: botStatus.token },
        });
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    }

    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: (prev[activeChannelId] || []).filter((m) => m.id !== messageId),
    }));
  };

  // Add Reaction
  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!activeChannelId) return;

    if (botStatus.mode === 'real' && botStatus.token) {
      try {
        await fetch(
          `/api/discord/channels/${activeChannelId}/messages/${messageId}/reactions/${encodeURIComponent(
            emoji
          )}/@me`,
          {
            method: 'PUT',
            headers: { Authorization: botStatus.token },
          }
        );
      } catch (err) {
        console.error('Failed to add reaction:', err);
      }
    }

    setMessages((prev) => {
      const channelMsgs = prev[activeChannelId] || [];
      const updated = channelMsgs.map((m) => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          const existing = reactions.find((r) => r.emoji.name === emoji);
          let newReactions = [];
          if (existing) {
            newReactions = reactions.map((r) =>
              r.emoji.name === emoji
                ? { ...r, count: r.count + 1, me: true }
                : r
            );
          } else {
            newReactions = [...reactions, { emoji: { name: emoji }, count: 1, me: true }];
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      });
      return { ...prev, [activeChannelId]: updated };
    });
  };

  // Create Channel
  const handleCreateChannel = async (
    name: string,
    type: ChannelType,
    topic?: string
  ) => {
    if (!activeGuildId) return;

    if (botStatus.mode === 'real' && botStatus.token) {
      try {
        const res = await fetch(`/api/discord/guilds/${activeGuildId}/channels`, {
          method: 'POST',
          headers: {
            Authorization: botStatus.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, type, topic }),
        });
        const data = await res.json();
        if (data.channel) {
          setGuilds((prev) =>
            prev.map((g) => {
              if (g.id === activeGuildId) {
                return { ...g, channels: [...(g.channels || []), data.channel] };
              }
              return g;
            })
          );
          setActiveChannelId(data.channel.id);
        }
      } catch (err) {
        console.error('Failed to create channel:', err);
      }
    } else {
      const newChan: DiscordChannel = {
        id: `chan_${Date.now()}`,
        name,
        type,
        topic,
        guild_id: activeGuildId,
      };

      setGuilds((prev) =>
        prev.map((g) => {
          if (g.id === activeGuildId) {
            return { ...g, channels: [...(g.channels || []), newChan] };
          }
          return g;
        })
      );
      setActiveChannelId(newChan.id);
    }
  };

  // Delete Channel
  const handleDeleteChannel = async (channelId: string) => {
    if (botStatus.mode === 'real' && botStatus.token) {
      try {
        await fetch(`/api/discord/channels/${channelId}`, {
          method: 'DELETE',
          headers: { Authorization: botStatus.token },
        });
      } catch (err) {
        console.error('Failed to delete channel:', err);
      }
    }

    setGuilds((prev) =>
      prev.map((g) => {
        if (g.id === activeGuildId) {
          const remaining = (g.channels || []).filter((c) => c.id !== channelId);
          return { ...g, channels: remaining };
        }
        return g;
      })
    );

    if (activeChannelId === channelId) {
      const remainingChannels = activeGuild?.channels?.filter((c) => c.id !== channelId);
      if (remainingChannels && remainingChannels.length > 0) {
        setActiveChannelId(remainingChannels[0].id);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#1e1f22] overflow-hidden font-sans text-gray-100 antialiased">
      {/* 1. Left Guilds Bar */}
      <GuildSidebar
        guilds={guilds}
        activeGuildId={activeGuildId}
        onSelectGuild={setActiveGuildId}
        botStatus={botStatus}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        onOpenCreateChannelModal={() => setIsCreateChannelModalOpen(true)}
      />

      {/* 2. Channels Sidebar */}
      <ChannelSidebar
        guild={activeGuild}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        botUser={botStatus.botUser}
        botStatus={botStatus}
        onOpenCreateChannelModal={() => setIsCreateChannelModalOpen(true)}
        onDeleteChannel={handleDeleteChannel}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        activeVoiceChannel={activeVoiceChannel}
        onJoinVoiceChannel={handleJoinVoiceChannel}
        onLeaveVoiceChannel={handleLeaveVoiceChannel}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isDeafened={isDeafened}
        setIsDeafened={setIsDeafened}
      />

      {/* 3. Main Center Content (Text Chat or Voice Overlay) */}
      {activeVoiceChannel ? (
        <VoiceRoomOverlay
          channel={activeVoiceChannel}
          botUser={botStatus.botUser}
          botStatus={botStatus}
          gatewayVoiceState={gatewayVoiceState}
          onLeaveVoice={handleLeaveVoiceChannel}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isDeafened={isDeafened}
          setIsDeafened={setIsDeafened}
        />
      ) : (
        <ChatArea
          channel={activeChannel}
          messages={messages[activeChannelId] || []}
          botUser={botStatus.botUser}
          botStatus={botStatus}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onAddReaction={handleAddReaction}
          onOpenEmbedModal={() => setIsEmbedModalOpen(true)}
          showMemberList={showMemberList}
          setShowMemberList={setShowMemberList}
        />
      )}

      {/* 4. Right Members Sidebar */}
      {showMemberList && !activeVoiceChannel && (
        <MemberList members={members} />
      )}

      {/* Modals */}
      <TokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        botStatus={botStatus}
        onSaveToken={handleSaveToken}
        onSwitchToDemoMode={handleSwitchToDemoMode}
      />

      <CreateChannelModal
        isOpen={isCreateChannelModalOpen}
        onClose={() => setIsCreateChannelModalOpen(false)}
        onCreateChannel={handleCreateChannel}
      />

      <EmbedBuilderModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        onSendEmbed={(embed) => handleSendMessage('', embed)}
      />
    </div>
  );
}
