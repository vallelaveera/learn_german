/** Reliable MP3 playback via HTMLAudioElement (avoids partial decodeAudioData gaps). */

export interface PlayMp3Options {
  isCancelled?: () => boolean;
  onElement?: (audio: HTMLAudioElement | null) => void;
  /** Fired once playback actually starts (after canplaythrough + play()). */
  onPlaying?: (audio: HTMLAudioElement) => void;
}

let activeStop: (() => void) | null = null;

/** Stop any in-progress playMp3Blob playback (e.g. new Maya line supersedes old). */
export function stopActiveMp3Playback(): void {
  activeStop?.();
  activeStop = null;
}

export function playMp3Blob(blob: Blob, opts: PlayMp3Options = {}): Promise<void> {
  if (!blob.size) return Promise.resolve();
  const url = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = "auto";
  opts.onElement?.(audio);

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (activeStop === abort) activeStop = null;
      audio.oncanplaythrough = null;
      audio.onerror = null;
      audio.onended = null;
      fn();
    };

    const abort = () => {
      done(() => {
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
        opts.onElement?.(null);
        resolve();
      });
    };

    activeStop = abort;

    audio.oncanplaythrough = () => {
      if (opts.isCancelled?.()) {
        abort();
        return;
      }
      audio
        .play()
        .then(() => {
          if (opts.isCancelled?.()) {
            abort();
            return;
          }
          opts.onPlaying?.(audio);
          audio.onended = () =>
            done(() => {
              opts.onElement?.(null);
              resolve();
            });
        })
        .catch(err =>
          done(() => {
            opts.onElement?.(null);
            reject(err);
          }),
        );
    };

    audio.onerror = () =>
      done(() => {
        opts.onElement?.(null);
        reject(new Error("MP3 playback failed"));
      });

    audio.src = url;
    audio.load();
  }).finally(() => {
    URL.revokeObjectURL(url);
  });
}

export async function playMp3Url(url: string, opts: PlayMp3Options = {}): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("MP3 fetch failed");
  const blob = await res.blob();
  await playMp3Blob(blob, opts);
}
