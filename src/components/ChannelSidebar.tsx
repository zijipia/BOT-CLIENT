import React, { useState } from 'react';
import { DiscordGuild, DiscordChannel, DiscordUser, BotStatusInfo } from '../types';
import {
  Hash,
  Volume2,
  Megaphone,
  ChevronDown,
  Plus,
  Settings,
  Mic,
  MicOff,
  Headphones,
  Shield,
  Trash2,
  Key,
  Info,
  Radio,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';

interface ChannelSidebarProps {
  guild: DiscordGuild | null;
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  botUser: DiscordUser | null;
  botStatus: BotStatusInfo;
  onOpenCreateChannelModal: () => void;
  onDeleteChannel: (channelId: string) => void;
  onOpenTokenModal: () => void;
  activeVoiceChannel: DiscordChannel | null;
  onJoinVoiceChannel: (channel: DiscordChannel) => void;
  onLeaveVoiceChannel: () => void;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isDeafened: boolean;
  setIsDeafened: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  guild,
  activeChannelId,
  onSelectChannel,
  botUser,
  botStatus,
  onOpenCreateChannelModal,
  onDeleteChannel,
  onOpenTokenModal,
  activeVoiceChannel,
  onJoinVoiceChannel,
  onLeaveVoiceChannel,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
}) => {
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (!guild) {
    return (
      <div className="w-60 bg-[#2b2d31] flex flex-col justify-between border-r border-[#1f2023] text-gray-400 p-4">
        <div className="flex flex-col items-center justify-center h-full text-center gap-3">
          <Radio className="w-10 h-10 text-gray-500 animate-pulse" />
          <p className="text-sm font-medium">Chọn một Server ở thanh bên trái để xem các kênh.</p>
        </div>
      </div>
    );
  }

  const channels = guild.channels || [];

  // Group channels into Categories and standalone
  const categories = channels.filter((c) => c.type === 4);
  const getChannelsForCategory = (catId: string) =>
    channels.filter((c) => c.parent_id === catId && c.type !== 4);
  const uncategorizedChannels = channels.filter(
    (c) => c.type !== 4 && (!c.parent_id || !categories.some((cat) => cat.id === c.parent_id))
  );

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const getChannelIcon = (type: number) => {
    switch (type) {
      case 2:
        return <Volume2 className="w-4 h-4 shrink-0 text-gray-400" />;
      case 5:
        return <Megaphone className="w-4 h-4 shrink-0 text-gray-400" />;
      default:
        return <Hash className="w-4 h-4 shrink-0 text-gray-400" />;
    }
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col justify-between select-none shrink-0 z-10 border-r border-[#1f2023]/60">
      {/* Server Header */}
      <div className="relative">
        <button
          id="server-header-menu-btn"
          onClick={() => setShowServerMenu(!showServerMenu)}
          className="w-full h-12 px-4 flex items-center justify-between font-bold text-white border-b border-[#1f2023] hover:bg-[#35373c] transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2 truncate">
            {botStatus.mode === 'real' ? (
              <Shield className="w-4 h-4 text-[#23a55a] shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="truncate">{guild.name}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showServerMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Server Dropdown Menu */}
        {showServerMenu && (
          <div className="absolute top-14 left-2 right-2 bg-[#111214] border border-[#2b2d31] rounded-lg shadow-2xl p-1.5 z-50 text-sm font-medium flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
            <button
              id="menu-create-channel-btn"
              onClick={() => {
                setShowServerMenu(false);
                onOpenCreateChannelModal();
              }}
              className="flex items-center justify-between px-2.5 py-2 rounded text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-colors"
            >
              <span>Tạo Kênh Mới</span>
              <Plus className="w-4 h-4" />
            </button>

            <button
              id="menu-token-settings-btn"
              onClick={() => {
                setShowServerMenu(false);
                onOpenTokenModal();
              }}
              className="flex items-center justify-between px-2.5 py-2 rounded text-gray-200 hover:bg-[#35373c] transition-colors"
            >
              <span>Cấu hình Bot Token</span>
              <Key className="w-4 h-4 text-amber-400" />
            </button>

            <div className="h-[1px] bg-[#2b2d31] my-0.5" />

            <div className="px-2.5 py-1.5 text-xs text-gray-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>{guild.member_count || guild.members?.length || 1} Thành viên</span>
            </div>
          </div>
        )}
      </div>

      {/* Channel List Scroller */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-3 custom-scrollbar">
        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {uncategorizedChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                onSelect={() => {
                  if (channel.type === 2) {
                    onJoinVoiceChannel(channel);
                  } else {
                    onSelectChannel(channel.id);
                  }
                }}
                onDelete={() => onDeleteChannel(channel.id)}
                getIcon={getChannelIcon}
              />
            ))}
          </div>
        )}

        {/* Categorized Channels */}
        {categories.map((category) => {
          const isCollapsed = collapsedCategories[category.id];
          const catChannels = getChannelsForCategory(category.id);

          return (
            <div key={category.id} className="flex flex-col gap-0.5">
              {/* Category Title Header */}
              <div
                onClick={() => toggleCategory(category.id)}
                className="flex items-center justify-between text-xs font-bold text-gray-400 hover:text-gray-200 px-1 py-1 cursor-pointer tracking-wider uppercase"
              >
                <div className="flex items-center gap-1">
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                  <span className="truncate max-w-[150px]">{category.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCreateChannelModal();
                  }}
                  className="hover:text-white p-0.5 rounded hover:bg-[#35373c]"
                  title="Thêm kênh trong danh mục"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Category Channels */}
              {!isCollapsed &&
                catChannels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={channel.id === activeChannelId}
                    onSelect={() => {
                      if (channel.type === 2) {
                        onJoinVoiceChannel(channel);
                      } else {
                        onSelectChannel(channel.id);
                      }
                    }}
                    onDelete={() => onDeleteChannel(channel.id)}
                    getIcon={getChannelIcon}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* Active Voice Connection Panel if connected */}
      {activeVoiceChannel && (
        <div className="bg-[#111214] p-2.5 border-t border-[#1f2023] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#23a55a]">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>Đã kết nối Voice RTC</span>
            </div>
            <button
              onClick={onLeaveVoiceChannel}
              className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-[#2b2d31]"
              title="Ngắt kết nối Voice"
            >
              <WifiOff className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs text-gray-200 font-medium truncate flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
            <span>{activeVoiceChannel.name}</span>
          </div>
        </div>
      )}

      {/* User / Bot Profile Footer */}
      <div className="h-14 bg-[#232428] px-2 flex items-center justify-between border-t border-[#1f2023]/80 shrink-0">
        <div className="flex items-center gap-2 max-w-[130px] truncate cursor-pointer hover:bg-[#35373c] p-1 rounded transition-colors">
          <div className="relative shrink-0">
            {botUser?.avatar ? (
              <img
                src={botUser.avatar}
                alt={botUser.username}
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-xs font-bold">
                {botUser?.username?.[0]?.toUpperCase() || 'B'}
              </div>
            )}
            {/* Status Indicator */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#232428] rounded-full ${
                botStatus.connected ? 'bg-[#23a55a]' : 'bg-amber-500'
              }`}
              title={botStatus.connected ? 'Gateway Connected' : 'Demo / Connecting'}
            />
          </div>

          <div className="flex flex-col truncate leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white truncate">
                {botUser?.global_name || botUser?.username || 'DiscordBot'}
              </span>
              <span className="bg-[#5865F2] text-[10px] font-extrabold text-white px-1 rounded h-3.5 flex items-center">
                BOT
              </span>
            </div>
            <span className="text-[11px] text-gray-400 truncate">
              #{botUser?.discriminator || '0001'}
            </span>
          </div>
        </div>

        {/* Audio & Settings Buttons */}
        <div className="flex items-center gap-0.5 text-gray-400">
          <button
            id="bot-mute-btn"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded hover:bg-[#35373c] hover:text-white transition-colors ${
              isMuted ? 'text-red-400' : ''
            }`}
            title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            id="bot-deafen-btn"
            onClick={() => setIsDeafened(!isDeafened)}
            className={`p-1.5 rounded hover:bg-[#35373c] hover:text-white transition-colors ${
              isDeafened ? 'text-red-400' : ''
            }`}
            title={isDeafened ? 'Bật Âm thanh' : 'Tắt Âm thanh'}
          >
            <Headphones className="w-4 h-4" />
          </button>

          <button
            id="bot-settings-btn"
            onClick={onOpenTokenModal}
            className="p-1.5 rounded hover:bg-[#35373c] hover:text-white transition-colors"
            title="Cài đặt Bot & Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ChannelItemProps {
  channel: DiscordChannel;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  getIcon: (type: number) => React.ReactNode;
}

const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  isActive,
  onSelect,
  onDelete,
  getIcon,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#404249] text-white font-medium'
          : 'text-gray-400 hover:bg-[#35373c] hover:text-gray-200'
      }`}
    >
      <div className="flex items-center gap-1.5 truncate">
        {getIcon(channel.type)}
        <span className="text-sm truncate">{channel.name}</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded hover:bg-[#2b2d31] transition-opacity"
        title="Xoá kênh này"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
