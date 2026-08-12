import React, { useState } from 'react';
import { DiscordMember, DiscordUser } from '../types';
import { Shield, Sparkles, MessageSquare, Bot, User } from 'lucide-react';

interface MemberListProps {
  members: DiscordMember[];
  onSelectMemberForDM?: (user: DiscordUser) => void;
}

export const MemberList: React.FC<MemberListProps> = ({ members, onSelectMemberForDM }) => {
  const [selectedUser, setSelectedUser] = useState<DiscordUser | null>(null);

  const onlineMembers = members.filter((m) => m.user.status === 'online' || m.user.status === 'idle' || m.user.status === 'dnd');
  const botMembers = members.filter((m) => m.user.bot);
  const offlineMembers = members.filter((m) => m.user.status === 'offline' || !m.user.status);

  return (
    <div className="w-60 bg-[#2b2d31] border-l border-[#1f2023]/60 flex flex-col p-3 overflow-y-auto custom-scrollbar select-none shrink-0 z-10">
      {/* Online Section */}
      {onlineMembers.length > 0 && (
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
            Đang Hoạt Động — {onlineMembers.length}
          </h3>
          {onlineMembers.map((member) => (
            <MemberCard
              key={member.user.id}
              member={member}
              onClick={() => setSelectedUser(member.user)}
            />
          ))}
        </div>
      )}

      {/* Offline Section */}
      {offlineMembers.length > 0 && (
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
            Ngoại Tuyến — {offlineMembers.length}
          </h3>
          {offlineMembers.map((member) => (
            <MemberCard
              key={member.user.id}
              member={member}
              onClick={() => setSelectedUser(member.user)}
            />
          ))}
        </div>
      )}

      {/* User Popout Card Modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-80 bg-[#111214] border border-[#2b2d31] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            {/* User Profile Banner Header */}
            <div className="h-24 bg-gradient-to-r from-[#5865F2] to-[#57F287] relative">
              <div className="absolute -bottom-8 left-4 p-1 bg-[#111214] rounded-full">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.username}
                    className="w-16 h-16 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-xl">
                    {selectedUser.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-4 pt-10 flex flex-col gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-bold text-white">
                    {selectedUser.global_name || selectedUser.username}
                  </h3>
                  {selectedUser.bot && (
                    <span className="bg-[#5865F2] text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded uppercase">
                      BOT
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">@{selectedUser.username}#{selectedUser.discriminator}</p>
              </div>

              {selectedUser.custom_status && (
                <div className="bg-[#1e1f22] p-2.5 rounded-lg border border-[#2b2d31] text-xs text-gray-200">
                  {selectedUser.custom_status}
                </div>
              )}

              {/* Badges / Information */}
              <div className="flex flex-col gap-1.5 text-xs text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Trạng thái Gateway:</span>
                  <span className="font-semibold text-[#23a55a] capitalize">
                    {selectedUser.status || 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Loại tài khoản:</span>
                  <span className="font-semibold text-white">
                    {selectedUser.bot ? 'Discord Application Bot' : 'Standard User'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  if (onSelectMemberForDM) onSelectMemberForDM(selectedUser);
                  setSelectedUser(null);
                }}
                className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Gửi Tin Nhắn Cho Bot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MemberCard: React.FC<{ member: DiscordMember; onClick: () => void }> = ({
  member,
  onClick,
}) => {
  const { user } = member;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-[#23a55a]';
      case 'idle':
        return 'bg-amber-400';
      case 'dnd':
        return 'bg-[#f23f43]';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#35373c] cursor-pointer transition-colors group"
    >
      <div className="relative shrink-0">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-xs font-bold">
            {user.username[0]?.toUpperCase()}
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#2b2d31] rounded-full ${getStatusColor(
            user.status
          )}`}
        />
      </div>

      <div className="flex flex-col truncate leading-tight">
        <div className="flex items-center gap-1 truncate">
          <span className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
            {user.global_name || user.username}
          </span>
          {user.bot && (
            <span className="bg-[#5865F2] text-[9px] font-extrabold text-white px-1 rounded h-3.5 flex items-center">
              BOT
            </span>
          )}
        </div>
        {user.custom_status && (
          <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
            {user.custom_status}
          </span>
        )}
      </div>
    </div>
  );
};
