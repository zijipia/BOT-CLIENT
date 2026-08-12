export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
  status?: UserStatus;
  activity?: string;
  custom_status?: string;
}

export type ChannelType = 0 | 2 | 4 | 5; // 0: GUILD_TEXT, 2: GUILD_VOICE, 4: GUILD_CATEGORY, 5: GUILD_ANNOUNCEMENT

export interface DiscordChannel {
  id: string;
  type: ChannelType;
  name: string;
  topic?: string | null;
  position?: number;
  guild_id?: string;
  parent_id?: string | null;
  nsfw?: boolean;
  unreadCount?: number;
  lastMessageId?: string;
}

export interface DiscordReaction {
  emoji: {
    id?: string | null;
    name: string;
  };
  count: number;
  me: boolean;
  users?: string[]; // user IDs
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number; // Integer color e.g. 0x5865F2
  fields?: DiscordEmbedField[];
  author?: {
    name: string;
    icon_url?: string;
    url?: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  proxy_url?: string;
  content_type?: string;
  height?: number;
  width?: number;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  edited_timestamp?: string | null;
  tts?: boolean;
  mention_everyone?: boolean;
  mentions?: DiscordUser[];
  attachments?: DiscordAttachment[];
  embeds?: DiscordEmbed[];
  reactions?: DiscordReaction[];
  pinned?: boolean;
  type?: number;
  referenced_message?: DiscordMessage | null;
}

export interface DiscordMember {
  user: DiscordUser;
  nick?: string | null;
  roles: string[];
  joined_at: string;
  deaf?: boolean;
  mute?: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string | null;
  owner_id?: string;
  description?: string | null;
  member_count?: number;
  channels?: DiscordChannel[];
  members?: DiscordMember[];
  unread?: boolean;
}

export interface BotStatusInfo {
  connected: boolean;
  mode: 'real' | 'demo';
  botUser: DiscordUser | null;
  token?: string;
  gatewayState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  pingMs?: number;
  error?: string | null;
  activeGuildsCount?: number;
}

export type BotConnectionStatus = BotStatusInfo;

export interface GatewayEventData {
  type: string;
  payload: any;
}
