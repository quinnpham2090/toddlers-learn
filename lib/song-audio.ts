import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { SongPitch } from './pack-loader';

const SAMPLE_RATE = 22050;
const AMPLITUDE = 0.45;
const ATTACK_SECONDS = 0.02;
const RELEASE_SECONDS = 0.18;

const PITCH_FREQUENCIES: Record<SongPitch, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
};

export function secondsPerNote(tempo: number): number {
  return 60 / Math.max(1, tempo);
}

function buildNoteSamples(pitch: SongPitch, duration: number): Float32Array {
  const frequency = PITCH_FREQUENCIES[pitch];
  const totalSamples = Math.max(1, Math.round(duration * SAMPLE_RATE));
  const attackSamples = Math.max(1, Math.round(ATTACK_SECONDS * SAMPLE_RATE));
  const releaseSamples = Math.max(
    1,
    Math.min(Math.round(RELEASE_SECONDS * SAMPLE_RATE), Math.floor(totalSamples / 3))
  );
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i += 1) {
    let envelope = 1;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i > totalSamples - releaseSamples) {
      envelope = (totalSamples - i) / releaseSamples;
    }
    samples[i] =
      Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE) * AMPLITUDE * Math.max(0, envelope);
  }
  return samples;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function buildWavBytes(notes: SongPitch[], secondsPer: number): Uint8Array {
  const bytesPerSample = 2;
  const totalSamples = Math.max(1, Math.round(secondsPer * SAMPLE_RATE)) * notes.length;
  const dataSize = totalSamples * bytesPerSample;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (const note of notes) {
    const samples = buildNoteSamples(note, secondsPer);
    for (let i = 0; i < samples.length; i += 1) {
      const value = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, Math.round(value * 32767), true);
      offset += 2;
    }
  }
  return buffer;
}

const playersByKey = new Map<string, AudioPlayer>();
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

function ensureWavFileUri(key: string, notes: SongPitch[], secondsPer: number): string | null {
  try {
    const file = new File(Paths.cache, `toddlers-learn-audio-${key}.wav`);
    if (!file.exists) {
      file.writeSync(buildWavBytes(notes, secondsPer));
    }
    return file.uri;
  } catch {
    return null;
  }
}

async function playAsync(key: string, notes: SongPitch[], secondsPer: number): Promise<void> {
  await ensureAudioMode();
  let player = playersByKey.get(key);
  if (!player) {
    const uri = ensureWavFileUri(key, notes, secondsPer);
    if (!uri) {
      return;
    }
    try {
      player = createAudioPlayer(uri);
    } catch {
      return;
    }
    playersByKey.set(key, player);
  }
  try {
    await player.seekTo(0);
  } catch {
    return;
  }
  try {
    player.play();
  } catch {
    return;
  }
}

export function playNoteSequence(notes: SongPitch[], secondsPer: number): void {
  if (notes.length === 0) {
    return;
  }
  const key = `${notes.join('_')}_${Math.round(secondsPer * 1000)}`;
  void playAsync(key, notes, secondsPer);
}
