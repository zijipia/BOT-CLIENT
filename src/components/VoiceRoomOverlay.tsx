import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DiscordChannel, DiscordUser, BotConnectionStatus } from '../types';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Radio,
  Monitor,
  CheckCircle2,
  ShieldAlert,
  Play,
  Pause,
  SkipForward,
  RadioTower,
  Music,
  Sliders,
  Disc,
  Layers,
  Settings,
  Activity,
  Plus,
  Radio as RadioIcon,
  Link as LinkIcon,
} from 'lucide-react';

export type AudioSourceMode = 'mic' | 'ziplayer' | 'dual';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  cover: string;
  audioUrl: string; // Real audio stream URL
  tempo: number;
  genre: string;
}

const DEFAULT_PLAYLIST: Track[] = [
  {
    id: 't1',
    title: 'Lofi Chill Beats - Coffee & Rain',
    artist: 'ZiPlayer Chillhop Engine',
    duration: 218,
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    genre: 'Lofi',
    tempo: 75,
  },
  {
    id: 't2',
    title: 'Midnight Synthwave Dreams',
    artist: 'Neon Cyber Studio',
    duration: 423,
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    genre: 'Synthwave',
    tempo: 110,
  },
  {
    id: 't3',
    title: 'Vietnamese Chill Piano Solo',
    artist: 'Acoustic Rain Studio',
    duration: 344,
    cover: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    genre: 'Acoustic',
    tempo: 65,
  },
  {
    id: 't4',
    title: 'Anime Study & Gaming Beats',
    artist: 'Otaku Chillroom',
    duration: 302,
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    genre: 'Anime',
    tempo: 85,
  },
];

interface VoiceRoomOverlayProps {
  channel: DiscordChannel;
  botUser: DiscordUser | null;
  botStatus?: BotConnectionStatus;
  gatewayVoiceState?: {
    confirmed: boolean;
    channelId?: string | null;
    sessionId?: string;
    endpoint?: string;
    message?: string;
  };
  onLeaveVoice: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isDeafened: boolean;
  setIsDeafened: (deafened: boolean) => void;
}

export const VoiceRoomOverlay: React.FC<VoiceRoomOverlayProps> = ({
  channel,
  botUser,
  botStatus,
  gatewayVoiceState,
  onLeaveVoice,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
}) => {
  // Audio Input Source Mode State
  const [audioSource, setAudioSource] = useState<AudioSourceMode>('mic');

  // Mic Capture State
  const [isMicConnected, setIsMicConnected] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0-100
  const [micGain, setMicGain] = useState(85); // %
  const [micNoiseSuppression, setMicNoiseSuppression] = useState(true);

  // ZiPlayer Real Audio Player State
  const [playlist, setPlaylist] = useState<Track[]>(DEFAULT_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingZiPlayer, setIsPlayingZiPlayer] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0); // in seconds
  const [trackDuration, setTrackDuration] = useState(180);
  const [ziPlayerVolume, setZiPlayerVolume] = useState(75); // %
  const [customSongInput, setCustomSongInput] = useState('');
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Voice Room General UI State
  const [receiverVolume, setReceiverVolume] = useState<number>(80);
  const [isAudioContextActive, setIsAudioContextActive] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Web Audio Context & Nodes References
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const masterAnalyserRef = useRef<AnalyserNode | null>(null);

  // Physical Mic Stream References
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  // ZiPlayer Real HTMLAudioElement & Web Audio Nodes
  const ziPlayerAudioRef = useRef<HTMLAudioElement | null>(null);
  const ziPlayerMediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ziPlayerGainRef = useRef<GainNode | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const currentTrack = playlist[currentTrackIndex] || DEFAULT_PLAYLIST[0];

  // 1. Initialize Master Web Audio Engine & ZiPlayer HTML5 Audio Source
  const initAudioEngine = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = new AudioCtxClass();
          const masterGain = ctx.createGain();
          const masterAnalyser = ctx.createAnalyser();

          masterAnalyser.fftSize = 64;
          masterGain.gain.value = isDeafened ? 0 : receiverVolume / 100;

          masterGain.connect(masterAnalyser);
          masterAnalyser.connect(ctx.destination);

          audioCtxRef.current = ctx;
          masterGainRef.current = masterGain;
          masterAnalyserRef.current = masterAnalyser;
        }
      }

      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().then(() => {
          setIsAudioContextActive(true);
        });
      } else if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        setIsAudioContextActive(true);
      }

      // Initialize HTML5 Audio Element for ZiPlayer if not created
      if (!ziPlayerAudioRef.current) {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        ziPlayerAudioRef.current = audio;
      }

      // Connect HTML5 Audio Element to Web Audio Context via createMediaElementSource
      if (
        audioCtxRef.current &&
        ziPlayerAudioRef.current &&
        !ziPlayerMediaSourceRef.current &&
        masterGainRef.current
      ) {
        try {
          const mediaSource = audioCtxRef.current.createMediaElementSource(
            ziPlayerAudioRef.current
          );
          const ziGain = audioCtxRef.current.createGain();
          ziGain.gain.value = (ziPlayerVolume / 100);

          mediaSource.connect(ziGain);
          ziGain.connect(masterGainRef.current);

          ziPlayerMediaSourceRef.current = mediaSource;
          ziPlayerGainRef.current = ziGain;
        } catch (mediaSourceErr) {
          console.warn('ZiPlayer MediaElementSource connect notice:', mediaSourceErr);
        }
      }
    } catch (err) {
      console.warn('Web Audio API init error:', err);
    }
  }, [receiverVolume, isDeafened, ziPlayerVolume]);

  // Master Gain Update when volume or deafened changes
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(
        isDeafened ? 0 : receiverVolume / 100,
        audioCtxRef.current.currentTime
      );
    }
  }, [receiverVolume, isDeafened]);

  // Update ZiPlayer Gain Node when Volume or Audio Source changes
  useEffect(() => {
    if (ziPlayerGainRef.current && audioCtxRef.current) {
      const activeGain =
        audioSource === 'ziplayer' || audioSource === 'dual' ? ziPlayerVolume / 100 : 0;
      ziPlayerGainRef.current.gain.setValueAtTime(
        activeGain,
        audioCtxRef.current.currentTime
      );
    }
    if (ziPlayerAudioRef.current) {
      ziPlayerAudioRef.current.volume = Math.min(1, ziPlayerVolume / 100);
    }
  }, [ziPlayerVolume, audioSource]);

  // 2. Real Physical Microphone Capture
  const startMicrophone = async () => {
    initAudioEngine();
    if (!audioCtxRef.current) return;

    try {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: micNoiseSuppression,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      const ctx = audioCtxRef.current;

      const micSource = ctx.createMediaStreamSource(stream);
      const micGainNode = ctx.createGain();
      const micAnalyser = ctx.createAnalyser();

      micGainNode.gain.value = isMuted || audioSource === 'ziplayer' ? 0 : micGain / 100;
      micAnalyser.fftSize = 64;

      micSource.connect(micGainNode);
      micGainNode.connect(micAnalyser);

      if (masterGainRef.current) {
        micGainNode.connect(masterGainRef.current);
      }

      micSourceNodeRef.current = micSource;
      micGainNodeRef.current = micGainNode;
      micAnalyserRef.current = micAnalyser;

      setIsMicConnected(true);
    } catch (err) {
      console.warn('Microphone permission or capture error:', err);
      setIsMicConnected(false);
    }
  };

  const stopMicrophone = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setIsMicConnected(false);
    setMicLevel(0);
  };

  // Adjust Mic Gain
  useEffect(() => {
    if (micGainNodeRef.current && audioCtxRef.current) {
      const activeGain =
        isMuted || audioSource === 'ziplayer' ? 0 : micGain / 100;
      micGainNodeRef.current.gain.setValueAtTime(
        activeGain,
        audioCtxRef.current.currentTime
      );
    }
  }, [micGain, isMuted, audioSource]);

  // Mic level analyzer loop
  useEffect(() => {
    if (!isMicConnected || !micAnalyserRef.current) return;

    const interval = setInterval(() => {
      if (micAnalyserRef.current && !isMuted && (audioSource === 'mic' || audioSource === 'dual')) {
        const dataArray = new Uint8Array(32);
        micAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);

        if (normalized > 12) {
          setActiveSpeaker(true);
        }
      } else {
        setMicLevel(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isMicConnected, isMuted, audioSource]);

  // Handle Audio Source Mode Switch
  useEffect(() => {
    if (audioSource === 'mic' || audioSource === 'dual') {
      startMicrophone();
    } else {
      stopMicrophone();
    }
  }, [audioSource, micNoiseSuppression]);

  // 3. ZiPlayer Real HTML5 Audio Event Listeners & Track Controller
  useEffect(() => {
    initAudioEngine();
    const audio = ziPlayerAudioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setTrackProgress(Math.floor(audio.currentTime));
      if (audioSource === 'ziplayer' || audioSource === 'dual') {
        setActiveSpeaker(!audio.paused && audio.currentTime > 0);
      }
    };

    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTrackDuration(Math.floor(audio.duration));
      }
    };

    const onEnded = () => {
      handleNextTrack();
    };

    const onError = (e: any) => {
      console.warn('ZiPlayer Audio Stream Error:', e);
      setPlayerError('Không thể nạp stream âm thanh này. Đang chuyển bài...');
      setTimeout(() => {
        setPlayerError(null);
        handleNextTrack();
      }, 2000);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [initAudioEngine, audioSource]);

  // Synchronize audio track URL when currentTrackIndex or playlist changes
  useEffect(() => {
    const audio = ziPlayerAudioRef.current;
    if (!audio) return;

    const rawUrl = currentTrack.audioUrl;
    let finalStreamUrl = rawUrl;

    // Use player.save() audio stream endpoint to pipe Readable audio stream
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      finalStreamUrl = `/api/ziplayer/stream?url=${encodeURIComponent(rawUrl)}&title=${encodeURIComponent(currentTrack.title)}`;
    }

    audio.src = finalStreamUrl;
    audio.load();
    setTrackProgress(0);
    setTrackDuration(currentTrack.duration || 180);

    if (isPlayingZiPlayer) {
      audio.play().catch((err) => {
        console.warn('ZiPlayer play stream warning:', err);
      });
    }
  }, [currentTrackIndex, playlist]);

  // Play / Pause ZiPlayer Real Audio Stream
  const toggleZiPlayerPlayback = async () => {
    initAudioEngine();
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    const audio = ziPlayerAudioRef.current;
    if (!audio) return;

    if (isPlayingZiPlayer) {
      audio.pause();
      setIsPlayingZiPlayer(false);
    } else {
      try {
        setPlayerError(null);
        if (!audio.src || audio.src === window.location.href) {
          const rawUrl = currentTrack.audioUrl;
          audio.src = `/api/ziplayer/stream?url=${encodeURIComponent(rawUrl)}&title=${encodeURIComponent(currentTrack.title)}`;
        }
        await audio.play();
        setIsPlayingZiPlayer(true);
      } catch (err: any) {
        console.warn('Playback stream error:', err);
        setPlayerError('Lỗi phát stream: Vui lòng nhấn nút Bật Âm Thanh!');
        setIsPlayingZiPlayer(false);
      }
    }
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  const handleSeek = (seconds: number) => {
    if (ziPlayerAudioRef.current) {
      ziPlayerAudioRef.current.currentTime = seconds;
      setTrackProgress(seconds);
    }
  };

  const handleAddCustomSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSongInput.trim()) return;

    const inputUrl = customSongInput.trim();
    const isDirectUrl = inputUrl.startsWith('http://') || inputUrl.startsWith('https://');

    const newSong: Track = {
      id: `custom_${Date.now()}`,
      title: isDirectUrl ? `Custom Audio Stream (${new URL(inputUrl).hostname})` : inputUrl,
      artist: 'User Requested Stream',
      duration: 240,
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      audioUrl: isDirectUrl ? inputUrl : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      tempo: 90,
      genre: 'Custom Stream',
    };

    setPlaylist((prev) => [...prev, newSong]);
    setCurrentTrackIndex(playlist.length);
    setCustomSongInput('');
    setIsPlayingZiPlayer(true);
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 4. Spectrum Analyzer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const renderWaveform = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const dataArray = new Uint8Array(32);
      if (masterAnalyserRef.current && isAudioContextActive && !isDeafened) {
        masterAnalyserRef.current.getByteFrequencyData(dataArray);
      } else if (activeSpeaker && !isDeafened) {
        for (let i = 0; i < 32; i++) {
          dataArray[i] = Math.floor(Math.sin(i * 0.3 + Date.now() * 0.008) * 100 + 120);
        }
      }

      const barWidth = (width / 32) * 0.75;
      let x = 0;

      for (let i = 0; i < 32; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#5865F2');
        gradient.addColorStop(0.5, '#23a55a');
        gradient.addColorStop(1, '#fee75c');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 3;
      }

      animationFrameRef.current = requestAnimationFrame(renderWaveform);
    };

    renderWaveform();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAudioContextActive, activeSpeaker, isDeafened]);

  const isRealBot = botStatus?.mode === 'real';

  return (
    <div className="flex-1 bg-[#111214] flex flex-col justify-between p-5 relative overflow-hidden select-none font-sans text-gray-100">
      {/* Background Soundwave Effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center gap-1.5 overflow-hidden">
        {[...Array(32)].map((_, i) => (
          <div
            key={i}
            className="w-2.5 bg-[#5865F2] rounded-full animate-pulse"
            style={{
              height: `${Math.sin(i + Date.now() * 0.002) * 45 + 55}%`,
              animationDuration: `${0.6 + (i % 7) * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* TOP HEADER: Channel Info & Gateway Status */}
      <div className="flex flex-col gap-2 z-10 w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between bg-[#1e1f22]/90 backdrop-blur border border-[#2b2d31] rounded-2xl px-5 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2]">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>{channel.name}</span>
                <span className="text-xs font-normal text-gray-400 bg-[#2b2d31] px-2 py-0.5 rounded-full">
                  Phòng Thoại Voice RTC
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {isRealBot
                  ? 'Kênh thoại kết nối Discord Gateway Real-time'
                  : 'Kênh thoại thử nghiệm ở Chế độ Mô Phỏng (Sandbox)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isRealBot ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#23a55a]/15 border border-[#23a55a]/40 text-xs font-bold text-[#23a55a]">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>GATEWAY OPCODE 4 ACTIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs font-bold text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                <span>SANDBOX VOICE MODE</span>
              </div>
            )}

            <button
              onClick={() => setShowSettingsPanel((prev) => !prev)}
              className={`p-2 rounded-xl border transition-all ${
                showSettingsPanel
                  ? 'bg-[#5865F2] border-[#5865F2] text-white'
                  : 'bg-[#2b2d31] border-[#3f4147] text-gray-300 hover:text-white'
              }`}
              title="Cài đặt Âm thanh"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real Gateway Voice Banner */}
        {isRealBot && gatewayVoiceState?.sessionId && (
          <div className="bg-[#18191c] border border-[#2b2d31] rounded-xl px-4 py-2 text-xs text-gray-300 flex items-center justify-between">
            <span className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Discord Voice Session Confirmed:
            </span>
            <span className="font-mono text-gray-400 bg-[#111214] px-2 py-0.5 rounded text-[11px]">
              Session ID: <strong className="text-white">{gatewayVoiceState.sessionId}</strong>
            </span>
            <span className="font-mono text-indigo-400 text-[11px]">
              RTC: {gatewayVoiceState.endpoint || 'Discord Voice Gateway'}
            </span>
          </div>
        )}
      </div>

      {/* MIDDLE MAIN LAYOUT: Split Grid for Participants & Source Controller */}
      <div className="flex-1 my-4 grid grid-cols-1 lg:grid-cols-12 gap-5 z-10 max-w-5xl w-full mx-auto overflow-hidden">
        {/* LEFT COLUMN (7 Cols): Voice Stage & Participant Cards */}
        <div className="lg:col-span-7 bg-[#18191c] border border-[#2b2d31] rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2b2d31] pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5865F2]" />
              <span className="text-xs font-bold text-gray-200">Kênh Thoại Đang Hoạt Động</span>
            </div>
            <span className="text-[11px] text-gray-400 bg-[#2b2d31] px-2.5 py-1 rounded-full font-mono">
              2 Thành viên
            </span>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-2 gap-4 my-auto py-4">
            {/* User Card */}
            <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 flex flex-col items-center justify-center gap-3 relative shadow">
              <div className="relative">
                {/* Speaking Animated Ring */}
                {activeSpeaker && !isMuted && !isDeafened && (
                  <div className="absolute -inset-2 rounded-full border-4 border-[#23a55a] animate-ping opacity-75" />
                )}

                <div
                  className={`w-20 h-20 rounded-full bg-[#5865F2] flex items-center justify-center overflow-hidden border-4 transition-all duration-300 ${
                    activeSpeaker && !isMuted && !isDeafened
                      ? 'border-[#23a55a] shadow-[0_0_20px_rgba(35,165,90,0.6)] scale-105'
                      : 'border-[#2b2d31]'
                  }`}
                >
                  <span className="text-2xl font-extrabold text-white">
                    {botUser?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>

                {isMuted && (
                  <div className="absolute bottom-0 right-0 p-1.5 bg-[#f23f43] rounded-full text-white border-2 border-[#1e1f22]">
                    <MicOff className="w-3.5 h-3.5" />
                  </div>
                )}
                {isDeafened && !isMuted && (
                  <div className="absolute bottom-0 right-0 p-1.5 bg-[#f23f43] rounded-full text-white border-2 border-[#1e1f22]">
                    <VolumeX className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <span className="font-bold text-white text-sm block">Bạn (Thành viên)</span>
                <span className="text-[11px] text-gray-400">
                  {audioSource === 'mic'
                    ? '🎙️ Micro Input Stream'
                    : audioSource === 'ziplayer'
                    ? '🎵 ZiPlayer Audio Stream'
                    : '🎛️ Dual Stream (Mic + ZiPlayer)'}
                </span>
              </div>

              {/* Live Mic Meter Bar */}
              {(audioSource === 'mic' || audioSource === 'dual') && (
                <div className="w-full bg-[#111214] h-1.5 rounded-full overflow-hidden border border-[#2b2d31] mt-1">
                  <div
                    className="bg-[#23a55a] h-full transition-all duration-100"
                    style={{ width: `${isMuted ? 0 : micLevel}%` }}
                  />
                </div>
              )}
            </div>

            {/* Discord Bot Card */}
            <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 flex flex-col items-center justify-center gap-3 relative shadow">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full bg-[#5865F2] flex items-center justify-center overflow-hidden border-4 transition-all duration-300 ${
                    isPlayingZiPlayer
                      ? 'border-[#23a55a] shadow-[0_0_20px_rgba(35,165,90,0.5)] scale-105'
                      : 'border-[#2b2d31]'
                  }`}
                >
                  {botUser?.avatar ? (
                    <img
                      src={botUser.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-2xl font-extrabold text-white">
                      {botUser?.username?.[0]?.toUpperCase() || 'B'}
                    </span>
                  )}
                </div>

                <div className="absolute -bottom-1 -right-1 p-1 bg-[#23a55a] rounded-full text-black border-2 border-[#1e1f22]">
                  <Disc className={`w-3.5 h-3.5 ${isPlayingZiPlayer ? 'animate-spin' : ''}`} />
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-bold text-white text-sm">
                    {botUser?.global_name || botUser?.username || 'Discord Bot'}
                  </span>
                  <span className="text-[9px] bg-[#23a55a] text-black font-extrabold px-1 rounded">
                    BOT
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">
                  {isPlayingZiPlayer ? '🎶 ZiPlayer Real Stream Active' : 'Sẵn sàng nhận tín hiệu'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Receiver Spectrum & Volume Meter */}
          <div className="bg-[#111214] border border-[#2b2d31] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RadioTower className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-200">Voice Output Receiver</span>
                <span className="text-[10px] text-gray-400">48kHz Real Stream Pipeline</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-gray-300">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[11px]">{isDeafened ? '0%' : `${receiverVolume}%`}</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={isDeafened ? 0 : receiverVolume}
                onChange={(e) => {
                  setReceiverVolume(Number(e.target.value));
                  if (isDeafened) setIsDeafened(false);
                }}
                className="w-20 accent-[#5865F2] h-1.5 bg-[#2b2d31] rounded cursor-pointer"
              />

              {/* Spectrum Visualizer Canvas */}
              <div className="w-20 h-6 bg-[#18191c] border border-[#2b2d31] rounded overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                <canvas ref={canvasRef} width={80} height={20} className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Audio Source Selector & ZiPlayer Controller */}
        <div className="lg:col-span-5 bg-[#18191c] border border-[#2b2d31] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex flex-col gap-3">
            {/* Audio Source Selector Mode Tabs */}
            <div className="flex items-center justify-between border-b border-[#2b2d31] pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-gray-200">Lựa Chọn Nguồn Âm Thanh Voice</span>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#111214] p-1 rounded-xl border border-[#2b2d31]">
              <button
                onClick={() => setAudioSource('mic')}
                className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  audioSource === 'mic'
                    ? 'bg-[#5865F2] text-white shadow'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e1f22]'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Micro User</span>
              </button>

              <button
                onClick={() => setAudioSource('ziplayer')}
                className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  audioSource === 'ziplayer'
                    ? 'bg-[#5865F2] text-white shadow'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e1f22]'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>ZiPlayer Stream</span>
              </button>

              <button
                onClick={() => setAudioSource('dual')}
                className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  audioSource === 'dual'
                    ? 'bg-[#5865F2] text-white shadow'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e1f22]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Kết Hợp Dual</span>
              </button>
            </div>

            {/* DYNAMIC CONTENT: Mode 1 - Micro Settings */}
            {(audioSource === 'mic' || audioSource === 'dual') && (
              <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-xl p-3 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-200 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" /> Thu Âm từ Microphone
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      isMicConnected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {isMicConnected ? 'Micro Active' : 'Micro Off'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-400 text-[11px]">Độ nhạy Mic Gain:</span>
                  <span className="font-mono text-white">{micGain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={micGain}
                  onChange={(e) => setMicGain(Number(e.target.value))}
                  className="w-full accent-[#5865F2] h-1.5 bg-[#111214] rounded cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-400 text-[11px]">Khử tiếng ồn (Noise Suppression):</span>
                  <button
                    onClick={() => setMicNoiseSuppression((prev) => !prev)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      micNoiseSuppression
                        ? 'bg-[#23a55a] text-black'
                        : 'bg-[#2b2d31] text-gray-400'
                    }`}
                  >
                    {micNoiseSuppression ? 'BẬT' : 'TẮT'}
                  </button>
                </div>
              </div>
            )}

            {/* DYNAMIC CONTENT: ZiPlayer Real Audio Stream Player Card */}
            {(audioSource === 'ziplayer' || audioSource === 'dual') && (
              <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-xl p-3 flex flex-col gap-3">
                {/* Track Info Header */}
                <div className="flex items-center gap-3">
                  <img
                    src={currentTrack.cover}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover border border-[#2b2d31] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                    <p className="text-[11px] text-gray-400 truncate">{currentTrack.artist}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] bg-[#5865F2]/20 text-[#5865F2] font-semibold px-1.5 py-0.2 rounded border border-[#5865F2]/30">
                        {currentTrack.genre}
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                        <RadioIcon className="w-2.5 h-2.5 animate-pulse" /> player.save() Readable Stream
                      </span>
                    </div>
                  </div>
                </div>

                {playerError && (
                  <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-1.5 rounded">
                    {playerError}
                  </div>
                )}

                {/* Progress Bar & Seek */}
                <div className="flex flex-col gap-1 text-[10px] font-mono text-gray-400">
                  <input
                    type="range"
                    min="0"
                    max={trackDuration || 100}
                    value={trackProgress}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full accent-[#5865F2] h-1.5 bg-[#111214] rounded cursor-pointer"
                  />
                  <div className="flex justify-between">
                    <span>{formatTime(trackProgress)}</span>
                    <span>{formatTime(trackDuration)}</span>
                  </div>
                </div>

                {/* Player Playback Controls */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handlePrevTrack}
                    className="p-1.5 bg-[#2b2d31] hover:bg-[#3f4147] text-white rounded-lg transition"
                    title="Bài trước"
                  >
                    <SkipForward className="w-4 h-4 rotate-180" />
                  </button>

                  <button
                    onClick={toggleZiPlayerPlayback}
                    className="px-4 py-2 bg-[#5865F2] hover:bg-indigo-600 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-all"
                  >
                    {isPlayingZiPlayer ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Dừng Stream ZiPlayer</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Phát Real Audio Stream</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className="p-1.5 bg-[#2b2d31] hover:bg-[#3f4147] text-white rounded-lg transition"
                    title="Bài kế tiếp"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* ZiPlayer Volume Slider */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Music className="w-3 h-3 text-indigo-400" /> ZiPlayer Gain:
                  </span>
                  <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ziPlayerVolume}
                      onChange={(e) => setZiPlayerVolume(Number(e.target.value))}
                      className="w-full accent-[#5865F2] h-1.5 bg-[#111214] rounded cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-gray-300 w-8">{ziPlayerVolume}%</span>
                  </div>
                </div>

                {/* Custom Track Stream Form */}
                <form onSubmit={handleAddCustomSong} className="flex gap-1.5 pt-1">
                  <div className="flex-1 relative flex items-center">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
                    <input
                      type="text"
                      value={customSongInput}
                      onChange={(e) => setCustomSongInput(e.target.value)}
                      placeholder="Nhập link mp3/stream âm thanh..."
                      className="w-full bg-[#111214] border border-[#2b2d31] rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-[#23a55a] hover:bg-emerald-600 text-black font-bold text-xs rounded-lg flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nạp Stream</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL DOCK BAR */}
      <div className="bg-[#2b2d31] border border-[#3f4147] rounded-2xl px-6 py-3 flex items-center justify-between gap-4 z-10 max-w-2xl w-full mx-auto shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-xs ${
              isMuted
                ? 'bg-[#f23f43] text-white hover:bg-red-600'
                : 'bg-[#313338] hover:bg-[#3f4147] text-white'
            }`}
            title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>{isMuted ? 'Tắt Mic' : 'Bật Mic'}</span>
          </button>

          <button
            onClick={() => setIsDeafened(!isDeafened)}
            className={`p-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-xs ${
              isDeafened
                ? 'bg-[#f23f43] text-white hover:bg-red-600'
                : 'bg-[#313338] hover:bg-[#3f4147] text-white'
            }`}
            title={isDeafened ? 'Bật Tai Nghe' : 'Tắt Tai Nghe'}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
            <span>{isDeafened ? 'Tắt Tai Nghe' : 'Bật Tai Nghe'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-xs ${
              isScreenSharing
                ? 'bg-[#23a55a] text-white'
                : 'bg-[#313338] hover:bg-[#3f4147] text-white'
            }`}
            title="Chia sẻ Màn hình"
          >
            <Monitor className="w-5 h-5" />
            <span>{isScreenSharing ? 'Đang Màn Hình' : 'Màn Hình'}</span>
          </button>

          <button
            onClick={onLeaveVoice}
            className="p-3 bg-[#f23f43] hover:bg-red-600 text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-xs shadow-lg"
            title="Ngắt Kết Nối Voice"
          >
            <PhoneOff className="w-5 h-5" />
            <span>Ngắt Kết Nối</span>
          </button>
        </div>
      </div>
    </div>
  );
};
