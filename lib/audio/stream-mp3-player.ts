import {
  detectNetworkTier,
  getTtsStreamChunkSize,
  refineNetworkTier,
  shouldBufferTtsBeforePlay,
  type NetworkTier,
} from "./network-tier";
import { isAndroidNative } from "@/lib/native/platform";
import { createCallAudioContext, resumeAudioContext } from "./mobile-audio-context";

export { getTtsStreamChunkSize, detectNetworkTier, TTS_CHUNK_DESKTOP } from "./network-tier";
export { createCallAudioContext, resumeAudioContext } from "./mobile-audio-context";

export interface StreamMp3PlayerRefs {
  nextStartTime: { current: number };
  sourceQueue: { current: AudioBufferSourceNode[] };
  audioElement?: { current: HTMLAudioElement | null };
}

export interface StreamMp3PlayerOptions {
  getAudioCtx: () => AudioContext;
  refs: StreamMp3PlayerRefs;
  onPlaybackDone: () => void;
  /** Fired after each decoded segment is scheduled (for mic prewarm timing). */
  onBufferScheduled?: () => void;
}

/**
 * Streams Soniox/Fish MP3 TTS with mobile-safe buffering.
 * Android: full-buffer + HTMLAudioElement when network is not fast (no partial decode crackle).
 * Other: larger adaptive chunks + serial decodeAudioData queue.
 */
export class StreamMp3Player {
  private pending = new Uint8Array(0);
  private decodeChain = Promise.resolve();
  private chunkMin: number;
  private tier: NetworkTier;
  private stopped = false;
  private dispatched = false;

  constructor(private opts: StreamMp3PlayerOptions) {
    this.tier = detectNetworkTier();
    this.chunkMin = getTtsStreamChunkSize(this.tier);
  }

  stop() {
    this.stopped = true;
    this.pending = new Uint8Array(0);
    const el = this.opts.refs.audioElement?.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
    }
  }

  async consumeResponse(res: Response): Promise<void> {
    if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);

    const readStart = Date.now();
    let firstByteMs = 0;

    if (shouldBufferTtsBeforePlay(this.tier)) {
      const blob = await res.blob();
      firstByteMs = Date.now() - readStart;
      this.tier = refineNetworkTier(this.tier, firstByteMs);
      await this.playWithAudioElement(blob);
      return;
    }

    const reader = res.body.getReader();
    while (!this.stopped) {
      const { done, value } = await reader.read();
      if (value?.length && !firstByteMs) {
        firstByteMs = Date.now() - readStart;
        this.tier = refineNetworkTier(this.tier, firstByteMs);
        this.chunkMin = getTtsStreamChunkSize(this.tier);
      }
      if (done) {
        await this.flush(true);
        break;
      }
      if (value?.length) this.append(value);
    }

    if (!this.dispatched && !this.stopped) {
      this.opts.onPlaybackDone();
    }
  }

  private append(chunk: Uint8Array) {
    const merged = new Uint8Array(this.pending.length + chunk.length);
    merged.set(this.pending);
    merged.set(chunk, this.pending.length);
    this.pending = merged;
    void this.scheduleDecode(false);
  }

  private flush(force: boolean) {
    return this.scheduleDecode(force);
  }

  private scheduleDecode(force: boolean): Promise<void> {
    this.decodeChain = this.decodeChain.then(() => this.tryDecode(force));
    return this.decodeChain;
  }

  private async tryDecode(force: boolean) {
    while (!this.stopped && this.pending.length > 0) {
      if (!force && this.pending.length < this.chunkMin) break;

      const take = force ? this.pending.length : Math.min(this.pending.length, this.chunkMin);
      const slice = this.pending.slice(0, take);
      const copy = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);

      try {
        const ctx = this.opts.getAudioCtx();
        await resumeAudioContext(ctx);
        const decoded = await ctx.decodeAudioData(copy);
        this.pending = this.pending.slice(take);
        this.dispatched = true;
        await this.enqueueBuffer(decoded, ctx);

        if (!force && this.pending.length < this.chunkMin) break;
        if (force && this.pending.length === 0) break;
        continue;
      } catch {
        if (force) {
          if (isAndroidNative() && this.pending.length > 0) {
            const blob = new Blob([this.pending], { type: "audio/mpeg" });
            this.pending = new Uint8Array(0);
            this.dispatched = true;
            await this.playWithAudioElement(blob);
          }
          break;
        }
        if (this.pending.length >= this.chunkMin * 2) {
          this.chunkMin = Math.min(98304, this.chunkMin + 8192);
        }
        break;
      }
    }
  }

  private enqueueBuffer(decoded: AudioBuffer, ctx: AudioContext): Promise<void> {
    return new Promise(resolve => {
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime, this.opts.refs.nextStartTime.current);
      source.start(startAt);
      this.opts.refs.nextStartTime.current = startAt + decoded.duration;
      source.onended = () => {
        this.opts.refs.sourceQueue.current = this.opts.refs.sourceQueue.current.filter(
          s => s !== source,
        );
        if (this.opts.refs.sourceQueue.current.length === 0 && !this.stopped) {
          this.opts.onPlaybackDone();
        }
        resolve();
      };
      this.opts.refs.sourceQueue.current.push(source);
      this.opts.onBufferScheduled?.();
    });
  }

  private async playWithAudioElement(blob: Blob) {
    const url = URL.createObjectURL(blob);
    try {
      let audio = this.opts.refs.audioElement?.current ?? null;
      if (!audio) {
        audio = new Audio();
        if (this.opts.refs.audioElement) {
          this.opts.refs.audioElement.current = audio;
        }
      }
      audio.src = url;
      await audio.play();
      this.dispatched = true;
      this.opts.onBufferScheduled?.();
      await new Promise<void>((resolve, reject) => {
        audio!.onended = () => resolve();
        audio!.onerror = () => reject(new Error("TTS audio playback failed"));
      });
      if (!this.stopped) {
        this.opts.onPlaybackDone();
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
