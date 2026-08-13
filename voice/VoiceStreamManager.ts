import { EndBehaviorType, type VoiceConnection } from "@discordjs/voice";
import prism from "prism-media";
import { EventEmitter } from "node:events";
import type { Readable } from "node:stream";

export interface VoiceUserStream {
  userId: string;
  opus: Readable;
  decoder: prism.opus.Decoder;
}

export interface VoicePCMFrame {
  userId: string;
  pcm: Buffer;
}

export class VoiceStreamManager extends EventEmitter {
  private readonly streams = new Map<string, VoiceUserStream>();

  constructor(private readonly connection: VoiceConnection) {
    super();
  }

  /**
   * Subscribe to a Discord user.
   */
  subscribe(userId: string) {
    if (this.streams.has(userId)) {
      return this.streams.get(userId);
    }

    const receiver = this.connection.receiver;
    if (!receiver) {
      console.warn(`[VoiceStreamManager] Receiver not available on voice connection.`);
      return null;
    }

    const opus = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    const decoder = new prism.opus.Decoder({
      rate: 48000,
      channels: 2,
      frameSize: 960,
    });

    const stream: VoiceUserStream = {
      userId,
      opus,
      decoder,
    };

    this.streams.set(userId, stream);

    opus.pipe(decoder);

    decoder.on("data", (pcm: Buffer) => {
      this.emit("pcm", {
        userId,
        pcm,
      } satisfies VoicePCMFrame);
    });

    const cleanup = () => {
      this.cleanup(userId);
    };

    opus.once("close", cleanup);
    opus.once("end", cleanup);
    opus.once("error", cleanup);
    decoder.once("error", cleanup);
    decoder.once("close", cleanup);

    this.emit("userStart", userId);
    return stream;
  }

  /**
   * Explicitly stop receiving a user.
   */
  unsubscribe(userId: string) {
    this.cleanup(userId);
  }

  /**
   * Remove every subscription.
   */
  destroy() {
    for (const userId of this.streams.keys()) {
      this.cleanup(userId);
    }
    this.streams.clear();
  }

  get(userId: string) {
    return this.streams.get(userId);
  }

  get users() {
    return [...this.streams.keys()];
  }

  private cleanup(userId: string) {
    const stream = this.streams.get(userId);
    if (!stream) {
      return;
    }
    this.streams.delete(userId);
    try {
      stream.opus.unpipe(stream.decoder);
    } catch {}
    try {
      stream.opus.destroy();
    } catch {}
    try {
      stream.decoder.destroy();
    } catch {}
    this.emit("userEnd", userId);
  }
}

// Global registry of VoiceStreamManagers keyed by Guild ID
export const voiceStreamManagers = new Map<string, VoiceStreamManager>();

export function createVoiceReceiver(
  connection: VoiceConnection,
) {
  const manager = new VoiceStreamManager(connection);
  connection.receiver.speaking.on("start", (userId) => {
    manager.subscribe(userId);
  });
  return manager;
}
