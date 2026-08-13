export class VoicePlayer {
  private context: AudioContext;
  private destination: AudioNode;
  private node!: AudioWorkletNode;
  private ws!: WebSocket;
  private activeUsers: string[] = [];
  public onUsersChange?: (users: string[]) => void;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.destination = destination;
  }

  async connect(url: string) {
    try {
      await this.context.audioWorklet.addModule(
        "/audio/voice-worklet.js"
      );
    } catch (e) {
      console.warn("[VoicePlayer] AudioWorklet module load note:", e);
    }

    this.node = new AudioWorkletNode(
      this.context,
      "discord-voice",
      {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      }
    );
    this.node.connect(this.destination);

    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        this.handleControl(JSON.parse(event.data));
        return;
      }
      this.handlePCM(event.data);
    };

    this.ws.onclose = () => {
      console.log("[VoicePlayer] WebSocket connection closed");
    };

    this.ws.onerror = (err) => {
      console.error("[VoicePlayer] WebSocket error:", err);
    };
  }

  private handleControl(message: any) {
    switch (message.type) {
      case "users":
        this.activeUsers = message.users || [];
        this.onUsersChange?.([...this.activeUsers]);
        for (const userId of this.activeUsers) {
          this.userStart(userId);
        }
        break;
      case "user:start":
        if (!this.activeUsers.includes(message.userId)) {
          this.activeUsers.push(message.userId);
          this.onUsersChange?.([...this.activeUsers]);
        }
        this.userStart(message.userId);
        break;
      case "user:end":
        this.activeUsers = this.activeUsers.filter((id) => id !== message.userId);
        this.onUsersChange?.([...this.activeUsers]);
        this.userEnd(message.userId);
        break;
    }
  }

  private handlePCM(buffer: ArrayBuffer) {
    if (buffer.byteLength <= 8) {
      return;
    }
    const view = new DataView(buffer);
    // Read 64-bit BigInt userId
    const userId = view.getBigUint64(0, false).toString();
    const pcm = buffer.slice(8);
    this.node?.port.postMessage(
      {
        type: "pcm",
        userId,
        buffer: pcm,
      },
      [pcm]
    );
  }

  private userStart(userId: string) {
    this.node?.port.postMessage({ type: "user:start", userId });
  }

  private userEnd(userId: string) {
    this.node?.port.postMessage({ type: "user:end", userId });
  }

  public setVolume(userId: string, volume: number) {
    this.node?.port.postMessage({
      type: "volume",
      userId,
      volume: Math.max(0, Math.min(2.0, volume)),
    });
  }

  public setMute(userId: string, muted: boolean) {
    this.node?.port.postMessage({
      type: "mute",
      userId,
      muted,
    });
  }

  public destroy() {
    try {
      this.ws?.close();
    } catch {}
    try {
      this.node?.disconnect();
    } catch {}
    this.activeUsers = [];
  }
}
