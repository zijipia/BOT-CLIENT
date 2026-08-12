import React, { useState } from 'react';
import { DiscordEmbed, DiscordEmbedField } from '../types';
import { Sparkles, Plus, Trash2, X, Eye } from 'lucide-react';

interface EmbedBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendEmbed: (embed: DiscordEmbed) => void;
}

export const EmbedBuilderModal: React.FC<EmbedBuilderModalProps> = ({
  isOpen,
  onClose,
  onSendEmbed,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#5865F2');
  const [authorName, setAuthorName] = useState('');
  const [authorIcon, setAuthorIcon] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [fields, setFields] = useState<DiscordEmbedField[]>([]);

  if (!isOpen) return null;

  const COLOR_PRESETS = [
    { name: 'Blurple', hex: '#5865F2' },
    { name: 'Green', hex: '#57F287' },
    { name: 'Gold', hex: '#FEE75C' },
    { name: 'Red', hex: '#ED4245' },
    { name: 'Fuchsia', hex: '#EB459E' },
    { name: 'Dark', hex: '#2B2D31' },
  ];

  const handleAddField = () => {
    setFields([...fields, { name: 'Tên trường', value: 'Nội dung giá trị', inline: true }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, key: 'name' | 'value', val: string) => {
    const updated = [...fields];
    updated[index][key] = val;
    setFields(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !description && fields.length === 0) return;

    // Convert hex color string to integer
    const colorInt = parseInt(colorHex.replace('#', ''), 16) || 0x5865F2;

    const embed: DiscordEmbed = {
      title: title || undefined,
      description: description || undefined,
      color: colorInt,
      author: authorName ? { name: authorName, icon_url: authorIcon || undefined } : undefined,
      fields: fields.length > 0 ? fields : undefined,
      image: imageUrl ? { url: imageUrl } : undefined,
      footer: footerText ? { text: footerText } : undefined,
    };

    onSendEmbed(embed);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-3xl bg-[#313338] border border-[#2b2d31] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e1f22] px-6 py-4 border-b border-[#2b2d31] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-lg">Discord Embed Builder</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2b2d31]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto custom-scrollbar">
          {/* Form Controls Left */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Color Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Màu Accent Embed
              </label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((cp) => (
                  <button
                    key={cp.hex}
                    type="button"
                    onClick={() => setColorHex(cp.hex)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      colorHex === cp.hex ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cp.hex }}
                    title={cp.name}
                  />
                ))}
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Tiêu đề Embed (Title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: 📢 Thông Báo Sự Kiện Mới!"
                className="w-full bg-[#1e1f22] border border-[#3f4147] focus:border-[#5865F2] rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none font-bold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Mô tả chi tiết (Description)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nội dung thông điệp chi tiết hỗ trợ định dạng Markdown..."
                rows={3}
                className="w-full bg-[#1e1f22] border border-[#3f4147] focus:border-[#5865F2] rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none resize-none"
              />
            </div>

            {/* Fields List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Các Trường Thông Tin (Fields)
                </label>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="text-xs font-semibold text-[#5865F2] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Trường</span>
                </button>
              </div>

              {fields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#1e1f22] p-2 rounded-xl border border-[#3f4147]">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => handleUpdateField(idx, 'name', e.target.value)}
                    placeholder="Tên trường"
                    className="w-1/3 bg-[#2b2d31] text-xs font-bold text-white px-2 py-1.5 rounded focus:outline-none"
                  />
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleUpdateField(idx, 'value', e.target.value)}
                    placeholder="Giá trị"
                    className="flex-1 bg-[#2b2d31] text-xs text-gray-200 px-2 py-1.5 rounded focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveField(idx)}
                    className="text-gray-400 hover:text-red-400 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer Text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Chân Trang (Footer)
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Chân trang • Discord Bot Manager"
                className="w-full bg-[#1e1f22] border border-[#3f4147] focus:border-[#5865F2] rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            <button
              id="submit-embed-btn"
              type="submit"
              className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold text-sm transition-colors mt-2"
            >
              Đăng Thẻ Embed Lên Kênh
            </button>
          </form>

          {/* Live Preview Right */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Eye className="w-4 h-4 text-[#5865F2]" />
              <span>Xem Trước Trực Tiếp (Live Preview):</span>
            </div>

            <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3f4147] flex flex-col gap-3">
              {/* Embed Card Render */}
              <div
                className="bg-[#1e1f22] p-3.5 rounded-r-md border-l-4 flex flex-col gap-2 shadow-lg"
                style={{ borderLeftColor: colorHex }}
              >
                {authorName && (
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    {authorIcon && <img src={authorIcon} alt="" className="w-4 h-4 rounded-full" />}
                    <span>{authorName}</span>
                  </div>
                )}

                <h4 className="font-bold text-white text-base">
                  {title || 'Tiêu đề Embed chưa nhập'}
                </h4>

                <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {description || 'Nội dung mô tả sẽ hiển thị tại đây...'}
                </p>

                {fields.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {fields.map((f, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xs font-bold text-gray-300">{f.name}</span>
                        <span className="text-xs text-gray-400">{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {footerText && (
                  <div className="text-[11px] text-gray-400 pt-1 border-t border-[#3f4147]/50 mt-1">
                    {footerText}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
