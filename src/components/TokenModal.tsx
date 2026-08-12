import React, { useState } from 'react';
import { BotStatusInfo } from '../types';
import { Key, ShieldCheck, Sparkles, ExternalLink, CheckCircle2, AlertTriangle, Eye, EyeOff, Radio, RefreshCw } from 'lucide-react';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  botStatus: BotStatusInfo;
  onSaveToken: (token: string) => Promise<boolean>;
  onSwitchToDemoMode: () => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({
  isOpen,
  onClose,
  botStatus,
  onSaveToken,
  onSwitchToDemoMode,
}) => {
  const [tokenInput, setTokenInput] = useState(botStatus.token || '');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg('Vui lòng nhập Discord Bot Token!');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const success = await onSaveToken(tokenInput.trim());
    setLoading(false);

    if (success) {
      setSuccessMsg('Đã xác thực và kết nối thành công với Discord Bot!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg('Token không hợp lệ hoặc không phải Bot Token. Hãy kiểm tra lại!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-lg bg-[#313338] border border-[#2b2d31] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1e1f22] px-6 py-4 border-b border-[#2b2d31] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#5865F2]" />
            <h3 className="font-bold text-white text-lg">Cấu hình Discord Bot Token</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-semibold p-1 rounded hover:bg-[#2b2d31]"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* Current Status Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#2b2d31] border border-[#35373c]">
            <div className="flex items-center gap-2.5">
              {botStatus.mode === 'real' && botStatus.connected ? (
                <ShieldCheck className="w-5 h-5 text-[#23a55a]" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-400" />
              )}
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Trạng thái hiện tại</span>
                <span className="text-sm font-bold text-white">
                  {botStatus.mode === 'real' && botStatus.connected
                    ? `Kết nối Live Bot: @${botStatus.botUser?.username || 'Bot'}`
                    : 'Chế độ Demo Sandbox'}
                </span>
              </div>
            </div>

            {botStatus.mode === 'real' ? (
              <button
                type="button"
                onClick={onSwitchToDemoMode}
                className="px-3 py-1.5 rounded-lg bg-[#35373c] hover:bg-[#404249] text-xs font-semibold text-amber-400 hover:text-white transition-colors"
              >
                Chuyển sang Demo
              </button>
            ) : (
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md font-semibold border border-amber-500/30">
                Sandbox Mode
              </span>
            )}
          </div>

          {/* Token Input Form */}
          <form onSubmit={handleValidate} className="flex flex-col gap-3">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Nhập Bot Token (Discord Bot Application Token)
            </label>

            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="MTM0..."
                className="w-full bg-[#1e1f22] border border-[#3f4147] focus:border-[#5865F2] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 font-mono focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-500/15 border border-green-500/40 rounded-xl text-xs text-green-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              id="submit-bot-token-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#404249] text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối Discord Gateway...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Xác Thực & Kết Nối Live Bot Token</span>
                </>
              )}
            </button>
          </form>

          {/* Guide Box */}
          <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#2b2d31] flex flex-col gap-2.5 text-xs text-gray-300">
            <div className="flex items-center justify-between font-bold text-white border-b border-[#2b2d31] pb-2">
              <span>📖 Hướng dẫn lấy Discord Bot Token:</span>
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noreferrer"
                className="text-[#5865F2] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Discord Dev Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-gray-300">
              <li>Mở **Discord Developer Portal** & ấn **New Application**.</li>
              <li>Vào mục **Bot** ở menu bên trái → Bấm **Reset Token** hoặc **Copy Token**.</li>
              <li>
                <strong className="text-amber-400">Quan trọng:</strong> Bật 3 mục Intents bên dưới:
                <code className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-white ml-1">Message Content Intent</code>,{' '}
                <code className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-white ml-1">Server Members Intent</code>,{' '}
                <code className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-white ml-1">Presence Intent</code>.
              </li>
              <li>Dán Token vào ô bên trên và bấm nút **Xác Thực** để trò chuyện trực tiếp!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
