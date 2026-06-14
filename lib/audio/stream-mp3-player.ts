import { playMp3Blob, stopActiveMp3Playback } from "./play-mp3-element";
import { createCallAudioContext, resumeAudioContext } from "./mobile-audio-context";

export { createCallAudioContext, resumeAudioContext } from "./mobile-audio-context";
export { detectNetworkTier, TTS_CHUNK_DESKTOP } from "./network-tier";

export interface StreamMp3PlayerRefs {
  nextStartTime: { current: number };
  sourceQueue: { current: AudioBufferSourceNode[] };
  audioElement?: { current: HTMLAudioElement | null };
}

export interface StreamMp3PlayerOptions {
  getAudioCtx: () => AudioContext;
  refs: StreamMp3PlayerRefs;
  onPlaybackDone: () => void;
  /** Called when playback starts — use to schedule early mic prewarm before Maya finishes. */
  onBufferScheduled?: () => void;
  isCancelled?: () => boolean;
}

/** Full-buffer MP3 TTS playback — no chunked decode (prevents mid-sentence gaps). */
export class StreamMp3Player {
  private stopped = false;

  constructor(private opts: StreamMp3PlayerOptions) {}

  stop() {
    this.stopped = true;
    stopActiveMp3Playback();
    const el = this.opts.refs.audioElement?.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      this.opts.refs.audioElement!.current = null;
    }
  }

  async consumeResponse(res: Response): Promise<void> {
    if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);
    if (this.stopped || this.opts.isCancelled?.()) return;

    const blob = await res.blob();
    if (this.stopped || this.opts.isCancelled?.() || blob.size === 0) return;

    await playMp3Blob(blob, {
      isCancelled: () => this.stopped || !!this.opts.isCancelled?.(),
      onElement: audio => {
        if (this.opts.refs.audioElement) {
          this.opts.refs.audioElement.current = audio;
        }
      },
      onPlaying: audio => {
        if (this.stopped || this.opts.isCancelled?.()) return;
        const ctx = this.opts.getAudioCtx();
        const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
        this.opts.refs.nextStartTime.current = ctx.currentTime + dur;
        this.opts.onBufferScheduled?.();
      },
    });

    if (!this.stopped && !this.opts.isCancelled?.()) {
      this.opts.onPlaybackDone();
    }
  }
}
