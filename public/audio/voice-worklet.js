class DiscordVoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.users = new Map();
    this.port.onmessage = (event) => {
      const message = event.data;
      if (message.type === "user:start") {
        this.ensureUser(message.userId);
        return;
      }
      if (message.type === "user:end") {
        this.users.delete(message.userId);
        return;
      }
      if (message.type === "volume") {
        const user = this.ensureUser(message.userId);
        user.volume = message.volume;
        return;
      }
      if (message.type === "mute") {
        const user = this.ensureUser(message.userId);
        user.muted = message.muted;
        if (message.muted) {
          user.queue = [];
          user.offset = 0;
        }
        return;
      }
      if (message.type === "pcm") {
        this.pushPCM(message.userId, message.buffer);
      }
    };
  }

  ensureUser(userId) {
    let user = this.users.get(userId);
    if (!user) {
      user = {
        queue: [],
        offset: 0,
        volume: 1.0,
        muted: false,
      };
      this.users.set(userId, user);
    }
    return user;
  }

  pushPCM(userId, buffer) {
    const user = this.ensureUser(userId);
    const pcm = new Int16Array(buffer);
    const samples = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      samples[i] = pcm[i] / 32768.0;
    }
    user.queue.push(samples);

    // Limit queue latency to 200ms (48kHz stereo)
    const MAX_QUEUE_MS = 200;
    const maxSamples = 48000 * 2 * (MAX_QUEUE_MS / 1000);
    let queuedSamples = 0;
    for (const chunk of user.queue) {
      queuedSamples += chunk.length;
    }
    while (queuedSamples > maxSamples && user.queue.length > 1) {
      const removed = user.queue.shift();
      queuedSamples -= removed.length;
    }
  }

  readFrame(user) {
    if (user.queue.length === 0 || user.muted) {
      return [0, 0];
    }
    const buffer = user.queue[0];
    const index = user.offset * 2;
    const left = buffer[index] ?? 0;
    const right = buffer[index + 1] ?? 0;
    user.offset++;
    if (user.offset * 2 >= buffer.length) {
      user.queue.shift();
      user.offset = 0;
    }
    const volume = user.volume;
    return [left * volume, right * volume];
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const left = output[0];
    const right = output[1];
    
    for (let i = 0; i < left.length; i++) {
      let l = 0;
      let r = 0;
      for (const user of this.users.values()) {
        const [ul, ur] = this.readFrame(user);
        l += ul;
        r += ur;
      }
      left[i] = Math.max(-1, Math.min(1, l));
      right[i] = Math.max(-1, Math.min(1, r));
    }
    return true;
  }
}

registerProcessor("discord-voice", DiscordVoiceProcessor);
