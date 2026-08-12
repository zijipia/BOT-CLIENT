import React from 'react';
import { DiscordGuild, BotStatusInfo } from '../types';
import { Plus, Compass, Key, Sparkles, Server, Radio, ShieldCheck } from 'lucide-react';

interface GuildSidebarProps {
  guilds: DiscordGuild[];
  activeGuildId: string;
  onSelectGuild: (guildId: string) => void;
  botStatus: BotStatusInfo;
  onOpenTokenModal: () => void;
  onOpenCreateChannelModal: () => void;
}

export const GuildSidebar: React.FC<GuildSidebarProps> = ({
  guilds,
  activeGuildId,
  onSelectGuild,
  botStatus,
  onOpenTokenModal,
  onOpenCreateChannelModal,
}) => {
  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-[#2b2d31]/50 shrink-0 select-none z-20">
      {/* Discord Direct / Home Icon */}
      <div className="relative group">
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r transition-all duration-200 ${
            activeGuildId === 'home' ? 'h-10' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          id="guild-home-btn"
          onClick={() => onSelectGuild(guilds[0]?.id || 'home')}
          className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center font-bold text-white shadow-lg ${
            activeGuildId === 'home' || activeGuildId === guilds[0]?.id
              ? 'bg-[#5865F2] rounded-[16px]'
              : 'bg-[#313338] hover:bg-[#5865F2]'
          }`}
          title="Server Direct Hub"
        >
          <Radio className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

      {/* Guild Icons List */}
      <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto no-scrollbar">
        {guilds.map((guild) => {
          const isActive = guild.id === activeGuildId;
          const initials = guild.name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .slice(0, 3)
            .toUpperCase();

          return (
            <div key={guild.id} className="relative group">
              {/* Active Indicator Pillar */}
              <div
                className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              />

              <button
                id={`guild-btn-${guild.id}`}
                onClick={() => onSelectGuild(guild.id)}
                className={`relative w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center font-semibold text-sm shadow-md overflow-hidden ${
                  isActive
                    ? 'bg-[#5865F2] text-white rounded-[16px]'
                    : 'bg-[#313338] text-gray-200 hover:bg-[#5865F2] hover:text-white'
                }`}
                title={guild.name}
              >
                {guild.icon ? (
                  <img
                    src={guild.icon}
                    alt={guild.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{initials}</span>
                )}

                {/* Unread Badge */}
                {guild.unread && !isActive && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#f23f43] border-2 border-[#1e1f22] rounded-full" />
                )}
              </button>
            </div>
          );
        })}

        {/* Add Channel / Server Button */}
        <div className="relative group mt-1">
          <button
            id="create-channel-btn"
            onClick={onOpenCreateChannelModal}
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23a55a] text-[#23a55a] hover:text-white transition-all duration-200 flex items-center justify-center"
            title="Tạo Kênh Mới trong Server"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

      {/* Bot Token / Config Manager Button */}
      <div className="relative group">
        <button
          id="token-settings-btn"
          onClick={onOpenTokenModal}
          className={`relative w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center ${
            botStatus.mode === 'real' && botStatus.connected
              ? 'bg-[#23a55a] text-white shadow-[0_0_12px_rgba(35,165,90,0.5)]'
              : 'bg-[#313338] hover:bg-[#f0b232] text-amber-400 hover:text-slate-900'
          }`}
          title="Cấu hình Discord Bot Token"
        >
          <Key className="w-5 h-5" />
          {botStatus.mode === 'real' && (
            <span className="absolute bottom-0 right-0 p-0.5 bg-[#111214] rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-[#23a55a]" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
