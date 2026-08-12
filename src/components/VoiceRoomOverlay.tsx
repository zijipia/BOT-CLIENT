import React, { useState, useEffect } from 'react';
import { DiscordChannel, DiscordUser, BotConnectionStatus } from '../types';
import { Volume2, Mic, MicOff, Headphones, PhoneOff, Radio, Monitor, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

interface VoiceRoomOverlayProps {
  channel: DiscordChannel;
  botUser: DiscordUser | null;
  botStatus?: BotConnectionStatus;
  gatewayVoiceState?: {
    confirmed: boolean;
    channelId?: string | null;
    sessionId?: string;
    endpoint?: string;
    message?: string;
  };
  onLeaveVoice: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isDeafened: boolean;
  setIsDeafened: (deafened: boolean) => void;
}

export const VoiceRoomOverlay: React.FC<VoiceRoomOverlayProps> = ({
  channel,
  botUser,
  botStatus,
  gatewayVoiceState,
  onLeaveVoice,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
}) => {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(true);

  // Toggle simulated speaking indicator periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMuted) {
        setActiveSpeaker((prev) => !prev);
      } else {
        setActiveSpeaker(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isMuted]);

  const isRealBot = botStatus?.mode === 'real';

  return (
    <div className="flex-1 bg-[#111214] flex flex-col items-center justify-between p-8 relative overflow-hidden select-none">
      {/* Background Animated Soundwave Visualizer */}
      <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center gap-1">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="w-2 bg-[#5865F2] rounded-full animate-pulse"
            style={{
              height: `${Math.sin(i + Date.now()) * 40 + 60}%`,
              animationDuration: `${0.8 + (i % 5) * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Voice Header */}
      <div className="flex flex-col items-center gap-2 z-10 max-w-xl text-center">
        {isRealBot ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#23a55a]/20 border border-[#23a55a]/50 text-xs font-bold text-[#23a55a]">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>DISCORD GATEWAY OPCODE 4 CONNECTED</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-xs font-bold text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>SANDBOX DEMO VOICE ROOM</span>
          </div>
        )}

        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Volume2 className="w-6 h-6 text-[#5865F2]" />
          <span>{channel.name}</span>
        </h2>

        {/* Real Connection vs Sandbox Explanation Banner */}
        {isRealBot ? (
          <div className="bg-[#1e1f22] border border-[#3f4147] rounded-xl p-3 text-xs text-gray-300 w-full mt-1 flex flex-col gap-1.5 shadow-lg">
            <div className="flex items-center justify-between text-[#23a55a] font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Tín hiệu Voice State Gateway (Opcode 4) đã gửi
              </span>
              <span className="text-[10px] bg-[#2b2d31] px-2 py-0.5 rounded text-gray-400">
                Guild: {channel.guild_id || 'Active'}
              </span>
            </div>
            {gatewayVoiceState?.sessionId && (
              <div className="text-[11px] font-mono text-gray-400 bg-[#111214] p-1.5 rounded flex items-center justify-between">
                <span>Session ID: <strong className="text-white">{gatewayVoiceState.sessionId}</strong></span>
                <span>RTC Server: <strong className="text-indigo-400">{gatewayVoiceState.endpoint || 'Discord RTC'}</strong></span>
              </div>
            )}
            <p className="text-[11px] text-gray-400">
              Bot đã phát tín hiệu `VOICE_STATE_UPDATE` qua WebSocket Gateway tới Discord. Bot sẽ xuất hiện trực tiếp trong kênh thoại thật trên Server Discord!
            </p>
          </div>
        ) : (
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200/90 w-full mt-1 text-left flex items-start gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Chế độ Mô Phỏng (Sandbox Mode)</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Bạn chưa kết nối Bot Token thật. Để Bot xuất hiện và phát nhạc trực tiếp trong kênh thoại thực tế trên Discord, hãy nhấn nút <strong>"Nhập Bot Token"</strong> ở góc dưới bên trái màn hình.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Voice Participants Grid */}
      <div className="flex-1 flex items-center justify-center gap-8 z-10 my-6">
        {/* User Card */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {/* Speaking Wave Ring */}
            {activeSpeaker && !isMuted && (
              <div className="absolute -inset-2 rounded-full border-4 border-[#23a55a] animate-ping opacity-75" />
            )}

            <div
              className={`w-28 h-28 rounded-full bg-[#5865F2] flex items-center justify-center overflow-hidden border-4 transition-all duration-300 ${
                activeSpeaker && !isMuted
                  ? 'border-[#23a55a] shadow-[0_0_24px_rgba(35,165,90,0.6)]'
                  : 'border-[#2b2d31]'
              }`}
            >
              {botUser?.avatar ? (
                <img
                  src={botUser.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-3xl font-extrabold text-white">
                  {botUser?.username?.[0]?.toUpperCase() || 'B'}
                </span>
              )}
            </div>

            {/* Muted Indicator Icon */}
            {isMuted && (
              <div className="absolute bottom-0 right-0 p-1.5 bg-[#f23f43] rounded-full text-white border-2 border-[#111214]">
                <MicOff className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center">
            <span className="font-bold text-white text-base flex items-center gap-1.5">
              {botUser?.global_name || botUser?.username || 'Discord Bot'}
              {isRealBot && <span className="text-[10px] bg-[#23a55a] text-black font-extrabold px-1.5 py-0.2 rounded">BOT</span>}
            </span>
            <span className="text-xs text-gray-400">
              {isMuted ? 'Đã tắt micro' : activeSpeaker ? '🔊 Đang nói...' : 'Đã kết nối'}
            </span>
          </div>
        </div>
      </div>

      {/* Voice Controls Bar */}
      <div className="bg-[#2b2d31] border border-[#3f4147] rounded-2xl px-6 py-3 flex items-center gap-4 z-10 shadow-2xl">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-3.5 rounded-xl transition-all duration-200 ${
            isMuted
              ? 'bg-[#f23f43] text-white hover:bg-red-600'
              : 'bg-[#313338] hover:bg-[#3f4147] text-white'
          }`}
          title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setIsDeafened(!isDeafened)}
          className={`p-3.5 rounded-xl transition-all duration-200 ${
            isDeafened
              ? 'bg-[#f23f43] text-white hover:bg-red-600'
              : 'bg-[#313338] hover:bg-[#3f4147] text-white'
          }`}
          title={isDeafened ? 'Bật Tai Nghe' : 'Tắt Tai Nghe'}
        >
          <Headphones className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsScreenSharing(!isScreenSharing)}
          className={`p-3.5 rounded-xl transition-all duration-200 ${
            isScreenSharing
              ? 'bg-[#23a55a] text-white'
              : 'bg-[#313338] hover:bg-[#3f4147] text-white'
          }`}
          title="Chia sẻ Màn hình"
        >
          <Monitor className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-8 bg-[#3f4147]" />

        <button
          onClick={onLeaveVoice}
          className="p-3.5 bg-[#f23f43] hover:bg-red-600 text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-sm shadow-lg"
          title="Ngắt Kết Nối Voice"
        >
          <PhoneOff className="w-5 h-5" />
          <span>Ngắt Kết Nối</span>
        </button>
      </div>
    </div>
  );
};
