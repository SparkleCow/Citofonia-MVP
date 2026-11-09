import { Platform } from 'react-native';

/**
 * Audio de la llamada sobre WebRTC. La señalización (offer/answer/ICE) viaja por STOMP
 * con `/app/call.signal`; el backend la retransmite como eventos SIGNAL a la otra parte.
 *
 *  - Nativo: `react-native-webrtc` (requiere development build; en Expo Go no existe el
 *    módulo nativo y la llamada sigue funcionando solo con señalización).
 *  - Web: WebRTC del navegador (getUserMedia exige HTTPS o localhost).
 *  - Red: STUN público por defecto; para llamadas fuera de la LAN hace falta TURN
 *    (EXPO_PUBLIC_TURN_URL / EXPO_PUBLIC_TURN_USERNAME / EXPO_PUBLIC_TURN_CREDENTIAL).
 */
export interface CallMedia {
  /** false si este cliente no puede transmitir audio (la UI lo comunica). */
  readonly available: boolean;
  start(role: 'caller' | 'callee', sendSignal: (kind: string, payload: unknown) => void): Promise<void>;
  handleSignal(kind: string, payload: unknown): Promise<void>;
  setMuted(muted: boolean): void;
  stop(): void;
}

type SessionDescriptionInit = { type: string; sdp: string };
type IceCandidateInit = { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null };

type MediaTrack = { enabled: boolean; stop: () => void };
type MediaStreamLike = { getTracks: () => MediaTrack[]; getAudioTracks: () => MediaTrack[] };

type PeerConnection = {
  onicecandidate: ((event: { candidate: (IceCandidateInit & { toJSON?: () => IceCandidateInit }) | null }) => void) | null;
  ontrack: ((event: { streams: MediaStreamLike[] }) => void) | null;
  addTrack: (track: MediaTrack, stream: MediaStreamLike) => void;
  createOffer: (options?: object) => Promise<SessionDescriptionInit>;
  createAnswer: () => Promise<SessionDescriptionInit>;
  setLocalDescription: (description: SessionDescriptionInit) => Promise<void>;
  setRemoteDescription: (description: unknown) => Promise<void>;
  addIceCandidate: (candidate: unknown) => Promise<void>;
  close: () => void;
};

type WebRtcModule = {
  RTCPeerConnection: new (config: object) => PeerConnection;
  RTCSessionDescription: new (init: SessionDescriptionInit) => unknown;
  RTCIceCandidate: new (init: IceCandidateInit) => unknown;
  mediaDevices: { getUserMedia: (constraints: object) => Promise<MediaStreamLike> };
};

type RemoteAudio = { srcObject: unknown; play: () => Promise<void>; pause: () => void };

let cachedModule: WebRtcModule | null | undefined;

function loadWebRtc(): WebRtcModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    if (Platform.OS === 'web') {
      const g = globalThis as unknown as {
        RTCPeerConnection?: WebRtcModule['RTCPeerConnection'];
        RTCSessionDescription?: WebRtcModule['RTCSessionDescription'];
        RTCIceCandidate?: WebRtcModule['RTCIceCandidate'];
        navigator?: { mediaDevices?: WebRtcModule['mediaDevices'] };
      };
      cachedModule =
        g.RTCPeerConnection && g.RTCSessionDescription && g.RTCIceCandidate && g.navigator?.mediaDevices
          ? {
              RTCPeerConnection: g.RTCPeerConnection,
              RTCSessionDescription: g.RTCSessionDescription,
              RTCIceCandidate: g.RTCIceCandidate,
              mediaDevices: g.navigator.mediaDevices,
            }
          : null;
    } else {
      // Carga diferida: en Expo Go el módulo nativo no existe y lanzaría al importarlo.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-webrtc') as WebRtcModule;
      cachedModule = mod?.RTCPeerConnection ? mod : null;
    }
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

function iceServers() {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const turn = process.env.EXPO_PUBLIC_TURN_URL?.trim();
  if (turn) {
    servers.push({
      urls: turn,
      username: process.env.EXPO_PUBLIC_TURN_USERNAME,
      credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

/** ¿Puede este dispositivo transmitir audio? */
export function isCallAudioAvailable() {
  return loadWebRtc() !== null;
}

class WebRtcCallMedia implements CallMedia {
  readonly available = true;
  private pc: PeerConnection | null = null;
  private local: MediaStreamLike | null = null;
  private remoteAudio: RemoteAudio | null = null;
  private remoteReady = false;
  private pendingCandidates: unknown[] = [];
  private ready: Promise<void> | null = null;
  private sendSignal: ((kind: string, payload: unknown) => void) | null = null;

  constructor(private readonly rtc: WebRtcModule) {}

  start(role: 'caller' | 'callee', sendSignal: (kind: string, payload: unknown) => void) {
    this.sendSignal = sendSignal;
    this.ready = this.setup(role);
    return this.ready;
  }

  private async setup(role: 'caller' | 'callee') {
    const pc = new this.rtc.RTCPeerConnection({ iceServers: iceServers() });
    this.pc = pc;
    // Solo en desarrollo: permite a las pruebas comprobar el estado real de la conexión.
    if (__DEV__) (globalThis as { __citofoniaPeer?: unknown }).__citofoniaPeer = pc;
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const c = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
      this.sendSignal?.('ice', { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex });
    };
    pc.ontrack = (event) => {
      // En nativo el audio remoto suena solo; en web hay que conectarlo a un <audio>.
      if (Platform.OS === 'web' && event.streams[0]) {
        const AudioCtor = (globalThis as unknown as { Audio?: new () => RemoteAudio }).Audio;
        if (AudioCtor) {
          const audio = new AudioCtor();
          audio.srcObject = event.streams[0];
          void audio.play().catch(() => undefined);
          this.remoteAudio = audio;
        }
      }
    };

    this.local = await this.rtc.mediaDevices.getUserMedia({ audio: true, video: false });
    this.local.getTracks().forEach((track) => pc.addTrack(track, this.local as MediaStreamLike));

    if (role === 'caller') {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      this.sendSignal?.('offer', { type: offer.type, sdp: offer.sdp });
    }
  }

  async handleSignal(kind: string, payload: unknown) {
    // Las señales pueden llegar antes de terminar getUserMedia: se espera a estar listos.
    if (this.ready) await this.ready.catch(() => undefined);
    const pc = this.pc;
    if (!pc) return;

    if (kind === 'offer') {
      await pc.setRemoteDescription(new this.rtc.RTCSessionDescription(payload as SessionDescriptionInit));
      await this.flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.sendSignal?.('answer', { type: answer.type, sdp: answer.sdp });
    } else if (kind === 'answer') {
      await pc.setRemoteDescription(new this.rtc.RTCSessionDescription(payload as SessionDescriptionInit));
      await this.flushCandidates();
    } else if (kind === 'ice' || kind === 'candidate') {
      const candidate = new this.rtc.RTCIceCandidate(payload as IceCandidateInit);
      if (this.remoteReady) await pc.addIceCandidate(candidate).catch(() => undefined);
      else this.pendingCandidates.push(candidate);
    }
  }

  private async flushCandidates() {
    this.remoteReady = true;
    const pending = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of pending) {
      await this.pc?.addIceCandidate(candidate).catch(() => undefined);
    }
  }

  setMuted(muted: boolean) {
    this.local?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  stop() {
    this.local?.getTracks().forEach((track) => track.stop());
    this.remoteAudio?.pause();
    this.pc?.close();
    this.pc = null;
    this.local = null;
    this.remoteAudio = null;
    this.pendingCandidates = [];
    this.remoteReady = false;
    this.ready = null;
  }
}

class NoopCallMedia implements CallMedia {
  readonly available = false;
  async start() {}
  async handleSignal() {}
  setMuted() {}
  stop() {}
}

/** Una instancia por llamada. */
export function createCallMedia(): CallMedia {
  const rtc = loadWebRtc();
  return rtc ? new WebRtcCallMedia(rtc) : new NoopCallMedia();
}
