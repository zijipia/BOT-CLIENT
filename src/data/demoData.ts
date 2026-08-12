import { DiscordGuild, DiscordMessage, DiscordUser } from '../types';

export const DEMO_BOT_USER: DiscordUser = {
  id: 'bot_10001',
  username: 'DiscordAssistantBot',
  discriminator: '0001',
  global_name: 'Ziji Helper Bot',
  avatar: 'https://raw.githubusercontent.com/zijipia/zijipia/refs/heads/main/Assets/zilove.png',
  bot: true,
  status: 'online',
  activity: 'Listening to !help | AI Gateway v10',
};

export const DEMO_USERS: DiscordUser[] = [
  DEMO_BOT_USER,
  {
    id: 'user_101',
    username: 'ziji_dev',
    discriminator: '1234',
    global_name: 'Ziji',
    avatar: 'https://raw.githubusercontent.com/zijipia/zijipia/refs/heads/main/Assets/donate.png',
    status: 'online',
    custom_status: '🚀 Building Discord bot UI...',
  },
  {
    id: 'user_102',
    username: 'chenius.space',
    discriminator: '5678',
    global_name: 'Chenius',
    avatar: 'https://raw.githubusercontent.com/zijipia/zijipia/refs/heads/main/Assets/chenius.png',
    status: 'idle',
    custom_status: '🎨 Designing UI mockups',
  },
  {
    id: 'user_103',
    username: 'clrd_studio',
    discriminator: '9999',
    global_name: 'CLRD',
    avatar: 'https://raw.githubusercontent.com/zijipia/zijipia/refs/heads/main/Assets/clrd.png',
    status: 'dnd',
    activity: 'Playing cs2',
  },
  {
    id: 'user_104',
    username: 'luna_code',
    discriminator: '2468',
    global_name: 'Luna Vance',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    status: 'offline',
  },
];

export const DEMO_GUILDS: DiscordGuild[] = [
  {
    id: 'guild_1',
    name: 'Developer Hub Vietnam',
    icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    description: 'Cộng đồng lập trình viên & Discord Bot Creators',
    member_count: 1420,
    channels: [
      { id: 'cat_1', type: 4, name: 'KÊNH THÔNG TIN', position: 0 },
      { id: 'chan_1', type: 0, name: 'thông-báo', topic: 'Thông báo chính thức từ ban quản trị Discord Client', position: 1, parent_id: 'cat_1' },
      { id: 'chan_2', type: 0, name: 'chào-mừng', topic: 'Giới thiệu bản thân và làm quen!', position: 2, parent_id: 'cat_1' },
      
      { id: 'cat_2', type: 4, name: 'TRÒ CHUYỆN & CODE', position: 3 },
      { id: 'chan_3', type: 0, name: 'general-chat', topic: 'Thảo luận tự do về công nghệ, Discord API & Bot Development', position: 4, parent_id: 'cat_2' },
      { id: 'chan_4', type: 0, name: 'bot-commands', topic: 'Gõ !help, !embed, !ping hoặc chat trực tiếp với DiscordAssistantBot!', position: 5, parent_id: 'cat_2' },
      { id: 'chan_5', type: 0, name: 'showcase', topic: 'Khoe dự án và sản phẩm mới nhất của bạn!', position: 6, parent_id: 'cat_2' },

      { id: 'cat_3', type: 4, name: 'VOICE CHANNELS', position: 7 },
      { id: 'chan_v1', type: 2, name: 'Phòng Họp Team 1', position: 8, parent_id: 'cat_3' },
      { id: 'chan_v2', type: 2, name: 'Lounge Lập Trình', position: 9, parent_id: 'cat_3' },
    ],
    members: [
      { user: DEMO_BOT_USER, roles: ['Bot Specialist', 'Administrator'], joined_at: '2024-01-01T00:00:00.000Z' },
      { user: DEMO_USERS[1], roles: ['Admin', 'Developer'], joined_at: '2024-01-02T10:00:00.000Z' },
      { user: DEMO_USERS[2], roles: ['UI Designer'], joined_at: '2024-01-03T12:00:00.000Z' },
      { user: DEMO_USERS[3], roles: ['Member'], joined_at: '2024-01-04T15:30:00.000Z' },
      { user: DEMO_USERS[4], roles: ['Member'], joined_at: '2024-01-05T09:15:00.000Z' },
    ],
  },
  {
    id: 'guild_2',
    name: 'Gaming & Esport Lounge',
    icon: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80',
    description: 'Server giao lưu game thủ, streaming & giải đấu',
    member_count: 850,
    channels: [
      { id: 'g_cat_1', type: 4, name: 'TEXT CHANNELS', position: 0 },
      { id: 'chan_g1', type: 0, name: 'lounge', topic: 'Trò chuyện chung về Esports và Game', position: 1, parent_id: 'g_cat_1' },
      { id: 'chan_g2', type: 0, name: 'lfg-find-team', topic: 'Tìm đồng đội rank Valorant, LMHT, CS2', position: 2, parent_id: 'g_cat_1' },
      { id: 'chan_g3', type: 0, name: 'game-highlights', topic: 'Chia sẻ clip highlight cực ngầu', position: 3, parent_id: 'g_cat_1' },
      
      { id: 'g_cat_2', type: 4, name: 'VOICE CHANNELS', position: 4 },
      { id: 'chan_gv1', type: 2, name: 'Squad Voice #1', position: 5, parent_id: 'g_cat_2' },
      { id: 'chan_gv2', type: 2, name: 'Squad Voice #2', position: 6, parent_id: 'g_cat_2' },
    ],
    members: [
      { user: DEMO_BOT_USER, roles: ['Bot Specialist'], joined_at: '2024-01-01T00:00:00.000Z' },
      { user: DEMO_USERS[3], roles: ['Gamer VIP'], joined_at: '2024-01-04T15:30:00.000Z' },
    ],
  },
  {
    id: 'guild_3',
    name: 'AI & Automation Lab',
    icon: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=120&auto=format&fit=crop&q=80',
    description: 'Nghiên cứu Gemini AI, LLMs & Discord Bot Automation',
    member_count: 530,
    channels: [
      { id: 'ai_cat_1', type: 4, name: 'GENERAL', position: 0 },
      { id: 'chan_ai1', type: 0, name: 'ai-discussion', topic: 'Thảo luận về Generative AI, LLM & Gemini API', position: 1, parent_id: 'ai_cat_1' },
      { id: 'chan_ai2', type: 0, name: 'prompt-sharing', topic: 'Chia sẻ prompt hay cho Bot', position: 2, parent_id: 'ai_cat_1' },
    ],
    members: [
      { user: DEMO_BOT_USER, roles: ['AI Bot Core'], joined_at: '2024-01-01T00:00:00.000Z' },
      { user: DEMO_USERS[1], roles: ['AI Engineer'], joined_at: '2024-01-02T10:00:00.000Z' },
    ],
  },
];

export const INITIAL_MESSAGES: Record<string, DiscordMessage[]> = {
  'chan_1': [
    {
      id: 'm_100',
      channel_id: 'chan_1',
      author: DEMO_BOT_USER,
      content: '📢 **Chào mừng bạn đến với Discord Bot Client Manager!**\n\nClient này cho phép bạn quản lý bot Discord thật bằng Bot Token hoặc trải nghiệm chế độ Sandbox thử nghiệm real-time.',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      embeds: [
        {
          title: '⚡ Tính năng nổi bật của Discord Client',
          description: 'Hệ thống hỗ trợ kết nối Gateway WebSocket v10 thời gian thực!',
          color: 0x5865F2,
          fields: [
            { name: '💬 Chat & Quản lý', value: 'Gửi tin nhắn, xoá message, thả reaction, reply tin nhắn.', inline: true },
            { name: '📁 Quản lý Kênh', value: 'Tạo Kênh Text/Voice, sửa channel topic, xoá channel.', inline: true },
            { name: '🤖 Embed Builder', value: 'Tạo thẻ Embed màu sắc chuyên nghiệp đăng trực tiếp bằng Bot.', inline: true },
            { name: '🔌 Gateway Real-time', value: 'Nhận event MESSAGE_CREATE, TYPING_START tức thì.', inline: true },
          ],
          footer: { text: 'Discord Bot Client • Powered by WebSocket Gateway' },
        },
      ],
      reactions: [
        { emoji: { name: '🚀' }, count: 12, me: true },
        { emoji: { name: '🔥' }, count: 8, me: false },
        { emoji: { name: '❤️' }, count: 15, me: false },
      ],
      pinned: true,
    },
  ],
  'chan_3': [
    {
      id: 'm_201',
      channel_id: 'chan_3',
      author: DEMO_USERS[1],
      content: 'Chào cả nhà! Mình vừa triển khai Discord client kết nối trực tiếp với Bot Token nè. Gửi tin nhắn siêu mượt luôn 🎉',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      reactions: [
        { emoji: { name: '👍' }, count: 5, me: false },
        { emoji: { name: '🎉' }, count: 3, me: true },
      ],
    },
    {
      id: 'm_202',
      channel_id: 'chan_3',
      author: DEMO_USERS[2],
      content: 'UI nhìn giống hệt Discord chính chủ luôn! Thích nhất phần hỗ trợ Embed builder và xem danh sách member online.',
      timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    },
    {
      id: 'm_203',
      channel_id: 'chan_3',
      author: DEMO_USERS[3],
      content: 'Có hỗ trợ đính kèm ảnh và code block markdown không mọi người?\n```javascript\nconst bot = new DiscordClient({ token: "YOUR_BOT_TOKEN" });\nbot.on("messageCreate", (msg) => {\n  console.log("New message:", msg.content);\n});\n```',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      reactions: [
        { emoji: { name: '💻' }, count: 4, me: true },
      ],
    },
    {
      id: 'm_204',
      channel_id: 'chan_3',
      author: DEMO_BOT_USER,
      content: 'Chắc chắn rồi! Tất cả cú pháp **Markdown**, `code blocks`, `||spoilers||` và đính kèm hình ảnh đều được render chuẩn xác 100%! ✨',
      timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ],
  'chan_4': [
    {
      id: 'm_301',
      channel_id: 'chan_4',
      author: DEMO_USERS[1],
      content: '!help',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'm_302',
      channel_id: 'chan_4',
      author: DEMO_BOT_USER,
      content: '🤖 **Danh sách lệnh hỗ trợ Bot:**',
      timestamp: new Date(Date.now() - 1795000).toISOString(),
      embeds: [
        {
          title: '🛠️ Discord Bot Assistant Commands',
          description: 'Bạn có thể thử nhập các lệnh sau trực tiếp vào ô chat:',
          color: 0x57F287,
          fields: [
            { name: '`!help`', value: 'Hiển thị danh sách câu lệnh' },
            { name: '`!ping`', value: 'Kiểm tra độ trễ kết nối Gateway (Latency ms)' },
            { name: '`!info`', value: 'Thông tin về Bot Token đang kết nối' },
            { name: '`!embed`', value: 'Tạo thẻ Embed mẫu tự động' },
            { name: '`!roll`', value: 'Tung xắc xắc may mắn (1 - 100)' },
          ],
        },
      ],
    },
  ],
};
