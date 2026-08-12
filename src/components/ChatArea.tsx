import React, { useState, useRef, useEffect } from 'react';
import {
  DiscordChannel,
  DiscordMessage,
  DiscordUser,
  DiscordEmbed,
  BotStatusInfo,
} from '../types';
import {
  Hash,
  Volume2,
  Megaphone,
  Bell,
  Pin,
  Users,
  Search,
  PlusCircle,
  Smile,
  Send,
  Trash2,
  Reply,
  Sparkles,
  ShieldCheck,
  Paperclip,
  Code,
  Check,
  X,
  AlertCircle,
  FileText,
  CornerDownRight,
} from 'lucide-react';

interface ChatAreaProps {
  channel: DiscordChannel | null;
  messages: DiscordMessage[];
  botUser: DiscordUser | null;
  botStatus: BotStatusInfo;
  onSendMessage: (content: string, embed?: DiscordEmbed, replyToId?: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onOpenEmbedModal: () => void;
  showMemberList: boolean;
  setShowMemberList: (show: boolean) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  messages,
  botUser,
  botStatus,
  onSendMessage,
  onDeleteMessage,
  onAddReaction,
  onOpenEmbedModal,
  showMemberList,
  setShowMemberList,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<DiscordMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '🎉', '💻', '🤖', '✨', '😂', '👀', '💯', '⭐'];

  const QUICK_COMMANDS = [
    { cmd: '!help', desc: 'Xem danh sách trợ giúp của Bot' },
    { cmd: '!ping', desc: 'Kiểm tra độ trễ Gateway Websocket (ms)' },
    { cmd: '!info', desc: 'Thông tin trạng thái Bot Token' },
    { cmd: '!embed', desc: 'Đăng thẻ Embed mẫu' },
    { cmd: '!roll', desc: 'Tung xúc xắc ngẫu nhiên (1-100)' },
  ];

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!channel) {
    return (
      <div className="flex-1 bg-[#313338] flex items-center justify-center text-gray-400">
        <p className="text-sm">Hãy chọn một kênh ở danh sách bên trái để bắt đầu chat.</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), undefined, replyingTo?.id);
    setInputText('');
    setReplyingTo(null);
    setShowQuickCommands(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex-1 bg-[#313338] flex flex-col justify-between overflow-hidden relative">
      {/* Channel Header Bar */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between bg-[#313338] z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <Hash className="w-5 h-5 text-gray-400 shrink-0" />
          <span className="font-bold text-white text-base truncate">{channel.name}</span>
          {channel.topic && (
            <>
              <div className="w-[1px] h-4 bg-[#3f4147] mx-1" />
              <span className="text-xs text-gray-400 truncate max-w-xs">{channel.topic}</span>
            </>
          )}
        </div>

        {/* Top Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Gateway Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e1f22] border border-[#3f4147] text-xs font-medium">
            {botStatus.mode === 'real' && botStatus.connected ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#23a55a]" />
                <span className="text-[#23a55a]">Live Gateway</span>
                {botStatus.pingMs && (
                  <span className="text-gray-400 font-mono text-[10px]">({botStatus.pingMs}ms)</span>
                )}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">Sandbox Demo Mode</span>
              </>
            )}
          </div>

          <button
            id="toggle-member-list-btn"
            onClick={() => setShowMemberList(!showMemberList)}
            className={`p-1.5 rounded hover:bg-[#35373c] transition-colors ${
              showMemberList ? 'text-white bg-[#35373c]' : 'text-gray-400'
            }`}
            title="Danh sách Thành viên"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 custom-scrollbar">
        {/* Channel Welcome Banner */}
        <div className="my-4 flex flex-col gap-2 border-b border-[#3f4147]/50 pb-6">
          <div className="w-16 h-16 rounded-full bg-[#404249] flex items-center justify-center text-white">
            <Hash className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Chào mừng đến với #{channel.name}!</h2>
          <p className="text-sm text-gray-400">
            Đây là phần khởi đầu của kênh <strong className="text-gray-200">#{channel.name}</strong>.
            {channel.topic && ` — ${channel.topic}`}
          </p>
        </div>

        {/* Message Items */}
        {messages.map((msg) => (
          <MessageCard
            key={msg.id}
            message={msg}
            botUser={botUser}
            onDelete={() => onDeleteMessage(msg.id)}
            onReply={() => setReplyingTo(msg)}
            onAddReaction={(emoji) => onAddReaction(msg.id, emoji)}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands Bar Suggestion */}
      {showQuickCommands && (
        <div className="mx-4 mb-1 p-2 bg-[#111214] border border-[#3f4147] rounded-lg text-xs flex flex-col gap-1 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="text-gray-400 font-bold px-2 py-1 uppercase tracking-wider text-[10px] border-b border-[#2b2d31]">
            ⚡ Gợi ý lệnh Bot nhanh:
          </div>
          {QUICK_COMMANDS.map((qc) => (
            <button
              key={qc.cmd}
              onClick={() => {
                setInputText(qc.cmd);
                setShowQuickCommands(false);
              }}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#2b2d31] text-gray-200 hover:text-white transition-colors text-left"
            >
              <span className="font-mono text-[#5865F2] font-bold">{qc.cmd}</span>
              <span className="text-gray-400">{qc.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Container */}
      <div className="px-4 pb-4 bg-[#313338]">
        {/* Reply Context Header */}
        {replyingTo && (
          <div className="bg-[#2b2d31] px-3 py-1.5 rounded-t-lg flex items-center justify-between text-xs text-gray-300 border-x border-t border-[#3f4147]">
            <div className="flex items-center gap-1.5 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Đang trả lời</span>
              <strong className="text-white">@{replyingTo.author.username}</strong>:
              <span className="italic truncate max-w-md">"{replyingTo.content}"</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          className={`bg-[#383a40] rounded-lg px-4 py-2.5 flex flex-col gap-2 relative ${
            replyingTo ? 'rounded-t-none border-x border-b border-[#3f4147]' : ''
          }`}
        >
          {/* Main Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (e.target.value.startsWith('!')) {
                setShowQuickCommands(true);
              } else {
                setShowQuickCommands(false);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Nhập tin nhắn tại #${channel.name} (Gõ ! để xem lệnh bot)...`}
            rows={2}
            className="w-full bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none resize-none custom-scrollbar"
          />

          {/* Bottom Toolbar inside input */}
          <div className="flex items-center justify-between pt-1 border-t border-[#404249]/50">
            <div className="flex items-center gap-2">
              {/* Embed Builder Trigger Button */}
              <button
                id="open-embed-modal-btn"
                type="button"
                onClick={onOpenEmbedModal}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#2b2d31] hover:bg-[#5865F2] text-xs font-semibold text-gray-200 hover:text-white transition-colors"
                title="Tạo Thẻ Embed Chuyên Nghiệp"
              >
                <Code className="w-3.5 h-3.5 text-amber-400" />
                <span>Thẻ Embed</span>
              </button>

              {/* Emoji Picker Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#404249] transition-colors"
                  title="Thêm Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Popover Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-10 left-0 bg-[#111214] border border-[#3f4147] rounded-lg p-2 shadow-2xl grid grid-cols-4 gap-1.5 z-50">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="p-1.5 hover:bg-[#2b2d31] rounded text-lg transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Send Button */}
            <button
              id="send-message-btn"
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                inputText.trim()
                  ? 'bg-[#5865F2] text-white hover:bg-[#4752C4]'
                  : 'bg-[#2b2d31] text-gray-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MessageCardProps {
  message: DiscordMessage;
  botUser: DiscordUser | null;
  onDelete: () => void;
  onReply: () => void;
  onAddReaction: (emoji: string) => void;
}

const MessageCard: React.FC<MessageCardProps> = ({
  message,
  botUser,
  onDelete,
  onReply,
  onAddReaction,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
      className="relative flex gap-3 p-1.5 hover:bg-[#2e3035] rounded transition-colors group"
    >
      {/* Hover Action Bar */}
      {showActions && (
        <div className="absolute -top-3 right-4 bg-[#2b2d31] border border-[#3f4147] rounded-md shadow-lg flex items-center p-0.5 gap-0.5 z-20">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#35373c]"
            title="Thả Cảm Xúc"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button
            onClick={onReply}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#35373c]"
            title="Trả Lời Tin Nhắn"
          >
            <Reply className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-[#35373c]"
            title="Xoá Tin Nhắn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Reaction Popover */}
      {showReactionPicker && (
        <div className="absolute -top-12 right-4 bg-[#111214] border border-[#3f4147] rounded-lg p-1.5 shadow-xl flex gap-1 z-30">
          {['❤️', '👍', '🔥', '🚀', '🎉'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onAddReaction(emoji);
                setShowReactionPicker(false);
              }}
              className="p-1 hover:bg-[#2b2d31] rounded text-base"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* User Avatar */}
      <div className="shrink-0 pt-0.5">
        {message.author.avatar ? (
          <img
            src={message.author.avatar}
            alt={message.author.username}
            className="w-10 h-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-sm">
            {message.author.username?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>

      {/* Message Content Container */}
      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        {/* Header line: username, bot tag, timestamp */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm hover:underline cursor-pointer">
            {message.author.global_name || message.author.username}
          </span>

          {message.author.bot && (
            <span className="bg-[#5865F2] text-[10px] font-extrabold text-white px-1 rounded h-3.5 flex items-center uppercase">
              BOT
            </span>
          )}

          <span className="text-xs text-gray-400">{formattedTime}</span>
        </div>

        {/* Reply reference preview if any */}
        {message.referenced_message && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#2b2d31]/60 px-2 py-1 rounded border-l-2 border-[#5865F2]">
            <CornerDownRight className="w-3 h-3 text-[#5865F2]" />
            <span className="font-semibold text-gray-300">@{message.referenced_message.author.username}</span>
            <span className="italic truncate">{message.referenced_message.content}</span>
          </div>
        )}

        {/* Text Message Content */}
        {message.content && (
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
            <DiscordMarkdown content={message.content} />
          </div>
        )}

        {/* Embed Cards if any */}
        {message.embeds && message.embeds.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {message.embeds.map((embed, idx) => (
              <DiscordEmbedCard key={idx} embed={embed} />
            ))}
          </div>
        )}

        {/* Reactions Row */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((react, i) => (
              <button
                key={i}
                onClick={() => onAddReaction(react.emoji.name)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                  react.me
                    ? 'bg-[#3c4270] border-[#5865F2] text-white'
                    : 'bg-[#2b2d31] border-[#3f4147] text-gray-300 hover:border-gray-400'
                }`}
              >
                <span>{react.emoji.name}</span>
                <span>{react.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Render Discord Embed
const DiscordEmbedCard: React.FC<{ embed: DiscordEmbed }> = ({ embed }) => {
  const borderColorHex = embed.color
    ? `#${embed.color.toString(16).padStart(6, '0')}`
    : '#5865F2';

  return (
    <div
      className="max-w-xl bg-[#2b2d31] rounded-r-md p-3.5 border-l-4 flex flex-col gap-2 shadow-md"
      style={{ borderLeftColor: borderColorHex }}
    >
      {/* Author Header */}
      {embed.author && (
        <div className="flex items-center gap-2">
          {embed.author.icon_url && (
            <img
              src={embed.author.icon_url}
              alt=""
              className="w-5 h-5 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-xs font-bold text-white">{embed.author.name}</span>
        </div>
      )}

      {/* Embed Title */}
      {embed.title && (
        <h4 className="font-bold text-white text-sm hover:underline cursor-pointer">
          {embed.title}
        </h4>
      )}

      {/* Embed Description */}
      {embed.description && (
        <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
          {embed.description}
        </p>
      )}

      {/* Embed Fields Grid */}
      {embed.fields && embed.fields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
          {embed.fields.map((field, fIdx) => (
            <div key={fIdx} className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-gray-300">{field.name}</span>
              <span className="text-xs text-gray-400">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Embed Image */}
      {embed.image && (
        <img
          src={embed.image.url}
          alt=""
          className="rounded-md max-h-60 object-cover mt-1"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Embed Footer */}
      {embed.footer && (
        <div className="text-[11px] text-gray-400 pt-1 border-t border-[#3f4147]/50 flex items-center gap-1.5">
          {embed.footer.icon_url && (
            <img src={embed.footer.icon_url} alt="" className="w-3.5 h-3.5 rounded-full" />
          )}
          <span>{embed.footer.text}</span>
        </div>
      )}
    </div>
  );
};

// Simple Discord Markdown Formatter
const DiscordMarkdown: React.FC<{ content: string }> = ({ content }) => {
  // Format code blocks ```js ... ```
  if (content.includes('```')) {
    const parts = content.split('```');
    return (
      <>
        {parts.map((part, idx) => {
          if (idx % 2 === 1) {
            // Inside code block
            return (
              <pre
                key={idx}
                className="bg-[#1e1f22] p-3 rounded-md font-mono text-xs text-green-400 my-1 overflow-x-auto border border-[#2b2d31]"
              >
                <code>{part.trim()}</code>
              </pre>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  }

  return <span>{content}</span>;
};
