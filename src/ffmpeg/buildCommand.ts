import fs from "node:fs";
import path from "node:path";

export type AudioRole = "background" | "focus";

export type AudioClip = {
  source: string;
  role: AudioRole;
  start?: number;
  duration?: number;
  volume?: number;
};

export type Scene = {
  type: "image" | "video";
  source: string;
  duration: number;
  audio?: AudioClip[];
};

export type Composition = {
  output?: string;
  width?: number;
  height?: number;
  fps?: number;
  scenes: Scene[];
  audio?: AudioClip[];
};

type AbsoluteAudio = {
  path: string;
  start: number;
  duration: number;
  volume: number;
};

const DEFAULT_VOLUME: Record<AudioRole, number> = {
  background: 0.3,
  focus: 1,
};

function assertComposition(value: unknown): Composition {
  if (!value || typeof value !== "object") {
    throw new Error("Composition must be a JSON object");
  }

  const composition = value as Composition;

  if (!Array.isArray(composition.scenes) || composition.scenes.length === 0) {
    throw new Error("Composition must include a non-empty scenes array");
  }

  for (const [index, scene] of composition.scenes.entries()) {
    if (scene.type !== "image" && scene.type !== "video") {
      throw new Error(`scenes[${index}].type must be "image" or "video"`);
    }
    if (!scene.source || typeof scene.source !== "string") {
      throw new Error(`scenes[${index}].source is required`);
    }
    if (!(scene.duration > 0)) {
      throw new Error(`scenes[${index}].duration must be > 0`);
    }
    for (const [audioIndex, clip] of (scene.audio ?? []).entries()) {
      assertAudioClip(clip, `scenes[${index}].audio[${audioIndex}]`);
    }
  }

  for (const [audioIndex, clip] of (composition.audio ?? []).entries()) {
    assertAudioClip(clip, `audio[${audioIndex}]`);
  }

  return composition;
}

function assertAudioClip(clip: AudioClip, label: string) {
  if (!clip.source || typeof clip.source !== "string") {
    throw new Error(`${label}.source is required`);
  }
  if (clip.role !== "background" && clip.role !== "focus") {
    throw new Error(`${label}.role must be "background" or "focus"`);
  }
  if (clip.start !== undefined && clip.start < 0) {
    throw new Error(`${label}.start must be >= 0`);
  }
  if (clip.duration !== undefined && !(clip.duration > 0)) {
    throw new Error(`${label}.duration must be > 0`);
  }
}

function resolveAsset(assetsDir: string, source: string) {
  const resolved = path.join(assetsDir, source);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Asset not found: ${source} (${resolved})`);
  }
  return resolved;
}

function resolveOutput(assetsDir: string, source: string) {
  const resolved = path.join(assetsDir, source);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

function prepareVideoFilter(
  inputLabel: string,
  outputLabel: string,
  width: number,
  height: number,
  fps: number,
) {
  return `[${inputLabel}]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p[${outputLabel}]`;
}

function prepareAudioFilter(
  inputLabel: string,
  outputLabel: string,
  clip: AbsoluteAudio,
  totalSeconds: number,
) {
  const delayMs = Math.round(clip.start * 1000);
  return (
    `[${inputLabel}]` +
    [
      `atrim=0:${clip.duration}`,
      "asetpts=PTS-STARTPTS",
      `volume=${clip.volume}`,
      `adelay=${delayMs}|${delayMs}`,
      `apad=whole_dur=${totalSeconds}`,
      "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo",
    ].join(",") +
    `[${outputLabel}]`
  );
}

function collectAbsoluteAudio(
  composition: Composition,
  assetsDir: string,
  totalSeconds: number,
): AbsoluteAudio[] {
  const clips: AbsoluteAudio[] = [];

  for (const clip of composition.audio ?? []) {
    const start = clip.start ?? 0;
    const remaining = totalSeconds - start;
    if (remaining <= 0) {
      continue;
    }
    clips.push({
      path: resolveAsset(assetsDir, clip.source),
      start,
      duration: Math.min(clip.duration ?? remaining, remaining),
      volume: clip.volume ?? DEFAULT_VOLUME[clip.role],
    });
  }

  let sceneStart = 0;
  for (const scene of composition.scenes) {
    for (const clip of scene.audio ?? []) {
      const relativeStart = clip.start ?? 0;
      const absoluteStart = sceneStart + relativeStart;
      const remainingInScene = scene.duration - relativeStart;
      const remainingInVideo = totalSeconds - absoluteStart;
      const available = Math.min(remainingInScene, remainingInVideo);
      if (available <= 0) {
        continue;
      }
      clips.push({
        path: resolveAsset(assetsDir, clip.source),
        start: absoluteStart,
        duration: Math.min(clip.duration ?? available, available),
        volume: clip.volume ?? DEFAULT_VOLUME[clip.role],
      });
    }
    sceneStart += scene.duration;
  }

  return clips;
}

export function buildCommand(options: {
  composition: unknown;
  assetsDir: string;
}): string[] {
  const composition = assertComposition(options.composition);
  const { assetsDir } = options;

  const width = composition.width ?? 1920;
  const height = composition.height ?? 1080;
  const fps = composition.fps ?? 25;
  const totalSeconds = composition.scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0,
  );
  const outputPath = resolveOutput(
    assetsDir,
    composition.output ?? "output.mp4",
  );

  const args: string[] = ["-y"];
  const filterParts: string[] = [];
  const videoLabels: string[] = [];

  for (const [index, scene] of composition.scenes.entries()) {
    const sourcePath = resolveAsset(assetsDir, scene.source);

    if (scene.type === "image") {
      args.push("-loop", "1", "-t", String(scene.duration), "-i", sourcePath);
    } else {
      args.push("-t", String(scene.duration), "-i", sourcePath);
    }

    const outputLabel = `v${index}`;
    filterParts.push(
      prepareVideoFilter(`${index}:v`, outputLabel, width, height, fps),
    );
    videoLabels.push(`[${outputLabel}]`);
  }

  const audioClips = collectAbsoluteAudio(composition, assetsDir, totalSeconds);
  const audioInputOffset = composition.scenes.length;

  if (audioClips.length === 0) {
    args.push(
      "-f",
      "lavfi",
      "-t",
      String(totalSeconds),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
    );
  } else {
    for (const clip of audioClips) {
      args.push("-i", clip.path);
    }
  }

  filterParts.push(
    `${videoLabels.join("")}concat=n=${composition.scenes.length}:v=1:a=0[vout]`,
  );

  if (audioClips.length === 0) {
    filterParts.push(
      `[${audioInputOffset}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]`,
    );
  } else if (audioClips.length === 1) {
    filterParts.push(
      prepareAudioFilter(
        `${audioInputOffset}:a`,
        "aout",
        audioClips[0],
        totalSeconds,
      ),
    );
  } else {
    const audioLabels: string[] = [];
    for (const [index, clip] of audioClips.entries()) {
      const inputIndex = audioInputOffset + index;
      const outputLabel = `a${index}`;
      filterParts.push(
        prepareAudioFilter(`${inputIndex}:a`, outputLabel, clip, totalSeconds),
      );
      audioLabels.push(`[${outputLabel}]`);
    }
    filterParts.push(
      `${audioLabels.join("")}amix=inputs=${audioClips.length}:duration=first:dropout_transition=0:normalize=0[aout]`,
    );
  }

  args.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-t",
    String(totalSeconds),
    "-pix_fmt",
    "yuv420p",
    outputPath,
  );

  return args;
}

export function formatFfmpegCommand(args: string[]) {
  return ["ffmpeg", ...args]
    .map((part) => (/\s/.test(part) ? `"${part}"` : part))
    .join(" ");
}
