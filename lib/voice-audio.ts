import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export interface VoicePlaybackHandle {
  stop: () => void;
}

let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) {
    return;
  }
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    audioModeReady = true;
  } catch {
    audioModeReady = true;
  }
}

let currentPlayback: VoicePlaybackHandle | null = null;

export function stopVoice(): void {
  if (currentPlayback) {
    currentPlayback.stop();
    currentPlayback = null;
  }
}

export function playVoiceAsset(
  asset: number,
  onDone: () => void,
  onError: () => void
): boolean {
  stopVoice();
  let player: AudioPlayer;
  try {
    void ensureAudioMode();
    player = createAudioPlayer(asset);
  } catch {
    onError();
    return false;
  }

  let finished = false;

  const cleanup = () => {
    try {
      player.remove();
    } catch {
      return;
    }
  };

  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (finished) {
      return;
    }
    if (status.didJustFinish) {
      finished = true;
      subscription.remove();
      cleanup();
      if (currentPlayback === handle) {
        currentPlayback = null;
      }
      onDone();
    } else if (status.playbackState === 'error') {
      finished = true;
      subscription.remove();
      cleanup();
      if (currentPlayback === handle) {
        currentPlayback = null;
      }
      onError();
    }
  });

  const handle: VoicePlaybackHandle = {
    stop: () => {
      finished = true;
      try {
        subscription.remove();
      } catch {
        return;
      }
      try {
        player.pause();
      } catch {
        return;
      }
      cleanup();
    },
  };

  currentPlayback = handle;

  try {
    player.play();
  } catch {
    if (currentPlayback === handle) {
      currentPlayback = null;
    }
    finished = true;
    try {
      subscription.remove();
    } catch {
      return false;
    }
    cleanup();
    onError();
    return false;
  }
  return true;
}
