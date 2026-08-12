import React, { useState } from 'react';
import { ChannelType } from '../types';
import { Hash, Volume2, Megaphone, Plus, X } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, type: ChannelType, topic?: string) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>(0); // 0 = GUILD_TEXT
  const [topic, setTopic] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Clean channel name (lowercase, replace spaces with hyphen for text channels)
    const cleanedName = type === 0 ? name.trim().toLowerCase().replace(/\s+/g, '-') : name.trim();
    onCreateChannel(cleanedName, type, topic.trim() || undefined);
    setName('');
    setTopic('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-md bg-[#313338] border border-[#2b2d31] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1e1f22] px-6 py-4 border-b border-[#2b2d31] flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Tạo Kênh Mới</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2b2d31]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Channel Type Choice */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Loại Kênh (CHANNEL TYPE)
            </label>

            <div className="flex flex-col gap-2">
              <label
                onClick={() => setType(0)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  type === 0
                    ? 'bg-[#2b2d31] border-[#5865F2] text-white'
                    : 'bg-[#1e1f22] border-[#2b2d31] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-gray-300" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">Text Channel</span>
                    <span className="text-xs text-gray-400">Đăng tin nhắn, hình ảnh, mã code và câu lệnh bot</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="channelType"
                  checked={type === 0}
                  onChange={() => setType(0)}
                  className="accent-[#5865F2]"
                />
              </label>

              <label
                onClick={() => setType(2)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  type === 2
                    ? 'bg-[#2b2d31] border-[#5865F2] text-white'
                    : 'bg-[#1e1f22] border-[#2b2d31] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-300" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">Voice Channel</span>
                    <span className="text-xs text-gray-400">Phòng thoại thoại trò chuyện âm thanh thời gian thực</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="channelType"
                  checked={type === 2}
                  onChange={() => setType(2)}
                  className="accent-[#5865F2]"
                />
              </label>

              <label
                onClick={() => setType(5)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  type === 5
                    ? 'bg-[#2b2d31] border-[#5865F2] text-white'
                    : 'bg-[#1e1f22] border-[#2b2d31] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-gray-300" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">Announcement Channel</span>
                    <span className="text-xs text-gray-400">Kênh thông báo chính thức được theo dõi bởi server khác</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="channelType"
                  checked={type === 5}
                  onChange={() => setType(5)}
                  className="accent-[#5865F2]"
                />
              </label>
            </div>
          </div>

          {/* Channel Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Tên Kênh (CHANNEL NAME)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                {type === 2 ? '🔊' : '#'}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="new-channel"
                className="w-full bg-[#1e1f22] border border-[#3f4147] focus:border-[#5865F2] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
                required
              />
            </div>
          </div>

          {/* Topic */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Chủ đề Kênh (CHANNEL TOPIC) - Không bắt buộc
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Mô tả mục đích sử dụng của kênh..."
              className="w-full bg-[#1e1f22] border border-[#3f4147] focus:border-[#5865F2] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2b2d31]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#2b2d31]"
            >
              Hủy
            </button>
            <button
              id="confirm-create-channel-btn"
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#404249] text-white rounded-xl font-bold text-sm transition-colors"
            >
              Tạo Kênh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
