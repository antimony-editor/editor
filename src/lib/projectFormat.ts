import { Sprite, SpriteState } from "./sprites";
import {
  DEFAULT_TWEEN_MODE,
  isTweenMode,
  type TweenableProperty,
  type TweenMode,
} from "./tween";
import {
  DEFAULT_PROJECT_SETTINGS,
  normalizeProjectSettings,
  type ProjectSettings,
} from "./settings";
import { DEFAULT_MEDIA_SRC } from "./sprites";

const MAGIC = "ANTIMONY";
const VERSION = 3;

interface Section {
  name: string;
  data: Uint8Array;
}

export async function serializeProject(
  projectName: string,
  state: SpriteState,
  settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const sections: Section[] = [];

  const cleanSprites = [];
  for (const sprite of state.sprites) {
    const cleanSounds = [];
    if (sprite.data && sprite.data.sounds) {
      for (const sound of sprite.data.sounds) {
        if (sound.src && sound.src.startsWith("blob:")) {
          try {
            const response = await fetch(sound.src);
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result ?? ""));
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            cleanSounds.push({ ...sound, src: dataUrl });
          } catch (e) {
            cleanSounds.push(sound);
          }
        } else {
          cleanSounds.push(sound);
        }
      }
    }
    if (sprite.data && sprite.data.sounds) {
      cleanSprites.push({
        ...sprite,
        data: {
          ...sprite.data,
          sounds: cleanSounds,
        },
      });
    } else {
      cleanSprites.push(sprite);
    }
  }
  const cleanState = { ...state, sprites: cleanSprites };

  const metadata = `name:${projectName}\nversion:${VERSION}`;
  sections.push({ name: "metadata", data: encoder.encode(metadata) });

  const stateBuffer = serializeState(cleanState, encoder);
  sections.push({ name: "state", data: stateBuffer });
  sections.push({
    name: "settings",
    data: encoder.encode(JSON.stringify(settings)),
  });

  const headerSize = 14;
  const sectionEntrySize = 24;
  const manifestSize = sections.length * sectionEntrySize;

  let currentOffset = headerSize + manifestSize;
  const totalSize =
    currentOffset + sections.reduce((sum, s) => sum + s.data.length, 0);

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  for (let i = 0; i < MAGIC.length; i++) {
    view.setUint8(i, MAGIC.charCodeAt(i));
  }
  view.setUint16(8, VERSION);
  view.setUint32(10, sections.length);

  let manifestPos = 14;
  for (const section of sections) {
    const nameBytes = encoder.encode(section.name.slice(0, 16));
    for (let i = 0; i < 16; i++) {
      view.setUint8(manifestPos + i, i < nameBytes.length ? nameBytes[i] : 0);
    }
    view.setUint32(manifestPos + 16, currentOffset);
    view.setUint32(manifestPos + 20, section.data.length);

    new Uint8Array(buffer, currentOffset, section.data.length).set(
      section.data,
    );

    manifestPos += sectionEntrySize;
    currentOffset += section.data.length;
  }

  return buffer;
}

function serializeState(state: SpriteState, encoder: TextEncoder): Uint8Array {
  const parts: Uint8Array[] = [];

  const countBuf = new Uint8Array(4);
  new DataView(countBuf.buffer).setUint32(0, state.sprites.length);
  parts.push(countBuf);

  for (const sprite of state.sprites) {
    parts.push(serializeString(sprite.id, encoder));
    parts.push(serializeString(sprite.name, encoder));
    parts.push(serializeString(sprite.type, encoder));

    const propsBuf = new Uint8Array(54);
    const view = new DataView(propsBuf.buffer);
    view.setFloat64(0, sprite.x);
    view.setFloat64(8, sprite.y);
    view.setFloat64(16, sprite.width);
    view.setFloat64(24, sprite.height);
    view.setFloat64(32, sprite.rotation);
    view.setFloat64(40, sprite.opacity);
    view.setUint8(48, sprite.visible ? 1 : 0);
    view.setUint8(49, sprite.locked ? 1 : 0);
    view.setInt32(50, sprite.zIndex);
    parts.push(propsBuf);

    parts.push(serializeSpriteData(sprite.data, encoder));
    parts.push(serializeString(sprite.blocklyXml, encoder));
    parts.push(serializeString(sprite.tweenMode, encoder));
    parts.push(serializeTweenModes(sprite.tweenModes, encoder));
  }

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

function serializeString(str: string, encoder: TextEncoder): Uint8Array {
  const bytes = encoder.encode(str);
  const buf = new Uint8Array(4 + bytes.length);
  new DataView(buf.buffer).setUint32(0, bytes.length);
  buf.set(bytes, 4);
  return buf;
}

function serializeTweenModes(
  modes: Partial<Record<TweenableProperty, TweenMode>>,
  encoder: TextEncoder,
): Uint8Array {
  const entries = Object.entries(modes).filter(([, mode]) => Boolean(mode));
  const parts: Uint8Array[] = [];

  const countBuf = new Uint8Array(4);
  new DataView(countBuf.buffer).setUint32(0, entries.length);
  parts.push(countBuf);

  for (const [property, mode] of entries) {
    parts.push(serializeString(property, encoder));
    parts.push(serializeString(mode, encoder));
  }

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

function serializeSpriteData(data: any, encoder: TextEncoder): Uint8Array {
  const entries = Object.entries(data);
  const parts: Uint8Array[] = [];

  const countBuf = new Uint8Array(4);
  new DataView(countBuf.buffer).setUint32(0, entries.length);
  parts.push(countBuf);

  for (const [k, v] of entries) {
    parts.push(serializeString(k, encoder));
    parts.push(serializeString(JSON.stringify(v), encoder));
  }

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

export async function deserializeProject(buffer: ArrayBuffer): Promise<{
  projectName: string;
  state: SpriteState;
  settings: ProjectSettings;
}> {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();

  let magic = "";
  for (let i = 0; i < 8; i++) magic += String.fromCharCode(view.getUint8(i));
  if (magic !== MAGIC) throw new Error("Invalid project file");

  const version = view.getUint16(8);
  const sectionCount = view.getUint32(10);

  let projectName = "Untitled Project";
  let state: SpriteState = { sprites: [], selectedSpriteId: null, loadKey: 0 };
  let settings = DEFAULT_PROJECT_SETTINGS;

  let manifestPos = 14;
  for (let i = 0; i < sectionCount; i++) {
    const nameBytes = new Uint8Array(buffer, manifestPos, 16);
    const name = decoder.decode(nameBytes).replace(/\0/g, "");
    const offset = view.getUint32(manifestPos + 16);
    const length = view.getUint32(manifestPos + 20);

    const data = new Uint8Array(buffer, offset, length);

    if (name === "metadata") {
      const metaStr = decoder.decode(data);
      const lines = metaStr.split("\n");
      for (const line of lines) {
        const [k, v] = line.split(":");
        if (k === "name") projectName = v;
      }
    } else if (name === "state") {
      state = deserializeState(data, version);
    } else if (name === "settings") {
      try {
        settings = normalizeProjectSettings(JSON.parse(decoder.decode(data)));
      } catch {
        settings = DEFAULT_PROJECT_SETTINGS;
      }
    }

    manifestPos += 24;
  }

  return { projectName, state, settings };
}

function deserializeState(data: Uint8Array, fileVersion: number): SpriteState {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;

  const spriteCount = view.getUint32(offset);
  offset += 4;

  const sprites: Sprite[] = [];
  for (let i = 0; i < spriteCount; i++) {
    const id = deserializeString(view, offset, decoder);
    offset += 4 + id.bytes.length;

    const name = deserializeString(view, offset, decoder);
    offset += 4 + name.bytes.length;

    const type = deserializeString(view, offset, decoder) as any;
    offset += 4 + type.bytes.length;

    const x = view.getFloat64(offset);
    const y = view.getFloat64(offset + 8);
    const width = view.getFloat64(offset + 16);
    const height = view.getFloat64(offset + 24);
    const rotation = view.getFloat64(offset + 32);
    const opacity = view.getFloat64(offset + 40);
    const visible = view.getUint8(offset + 48) === 1;
    const locked = view.getUint8(offset + 49) === 1;
    const zIndex = view.getInt32(offset + 50);
    offset += 54;

    const dataRes = deserializeSpriteData(view, offset, decoder);
    offset = dataRes.newOffset;

    const blocklyXml = deserializeString(view, offset, decoder);
    offset += 4 + blocklyXml.bytes.length;

    let tweenMode: TweenMode = DEFAULT_TWEEN_MODE;
    let tweenModes: Partial<Record<TweenableProperty, TweenMode>> = {};

    if (fileVersion >= 2 && offset < data.byteLength) {
      const tweenModeRes = deserializeString(view, offset, decoder);
      offset += 4 + tweenModeRes.bytes.length;
      tweenMode = isTweenMode(tweenModeRes.str)
        ? tweenModeRes.str
        : DEFAULT_TWEEN_MODE;

      if (offset < data.byteLength) {
        const tweenModesRes = deserializeTweenModes(view, offset, decoder);
        offset = tweenModesRes.newOffset;
        tweenModes = tweenModesRes.modes;
      }
    }

    const normalized = normalizeSpriteData(id.str, type.str, dataRes.data);

    sprites.push({
      id: id.str,
      name: name.str,
      type: normalized.type,
      x,
      y,
      width,
      height,
      rotation,
      rotationOriginX: 0.5,
      rotationOriginY: 0.5,
      opacity,
      visible,
      locked,
      zIndex,
      tweenMode,
      tweenModes,
      data: normalized.data,
      blocklyXml: blocklyXml.str,
    });
  }

  return {
    sprites,
    selectedSpriteId: sprites.length > 0 ? sprites[0].id : null,
    loadKey: 0,
  };
}

function deserializeString(
  view: DataView,
  offset: number,
  decoder: TextDecoder,
): { str: string; bytes: Uint8Array } {
  const len = view.getUint32(offset);
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset + 4, len);
  return { str: decoder.decode(bytes), bytes };
}

function deserializeTweenModes(
  view: DataView,
  offset: number,
  decoder: TextDecoder,
): { modes: Partial<Record<TweenableProperty, TweenMode>>; newOffset: number } {
  const count = view.getUint32(offset);
  let currentOffset = offset + 4;
  const modes: Partial<Record<TweenableProperty, TweenMode>> = {};

  for (let i = 0; i < count; i++) {
    const property = deserializeString(view, currentOffset, decoder);
    currentOffset += 4 + property.bytes.length;

    const mode = deserializeString(view, currentOffset, decoder);
    currentOffset += 4 + mode.bytes.length;

    if (isTweenMode(mode.str)) {
      modes[property.str as TweenableProperty] = mode.str;
    }
  }

  return { modes, newOffset: currentOffset };
}

function deserializeSpriteData(
  view: DataView,
  offset: number,
  decoder: TextDecoder,
): { data: any; newOffset: number } {
  const count = view.getUint32(offset);
  let currentOffset = offset + 4;
  const data: any = {};

  for (let i = 0; i < count; i++) {
    const key = deserializeString(view, currentOffset, decoder);
    currentOffset += 4 + key.bytes.length;

    const val = deserializeString(view, currentOffset, decoder);
    currentOffset += 4 + val.bytes.length;

    const v = val.str;
    try {
      data[key.str] = JSON.parse(v);
    } catch {
      if (v === "true") data[key.str] = true;
      else if (v === "false") data[key.str] = false;
      else if (!isNaN(Number(v)) && v.trim() !== "") data[key.str] = Number(v);
      else data[key.str] = v;
    }
  }

  return { data, newOffset: currentOffset };
}

function normalizeSpriteData(
  spriteId: string,
  type: string,
  data: any,
): { type: any; data: any } {
  const normalizeSounds = (sounds: any, currentSoundId: any) => {
    const normalizedSounds = Array.isArray(sounds)
      ? sounds.map((sound: any, index: number) => ({
          id: String(sound.id || `${spriteId}_sound_${index + 1}`),
          name: String(sound.name || `Sound ${index + 1}`),
          src: String(sound.src || ""),
          volume:
            typeof sound.volume === "number"
              ? Math.max(0, Math.min(1, sound.volume))
              : 1,
        }))
      : [
          {
            id: `${spriteId}_sound_1`,
            name: "Sound 1",
            src: DEFAULT_MEDIA_SRC.replace(
              "default_sprite.svg",
              "default_sound.mp3",
            ),
          },
        ];
    const normalizedCurrentSoundId = normalizedSounds.some(
      (sound: any) => sound.id === currentSoundId,
    )
      ? currentSoundId
      : normalizedSounds[0].id;
    return {
      sounds: normalizedSounds,
      currentSoundId: normalizedCurrentSoundId,
    };
  };

  const normalizeVideos = (videos: any, currentVideoId: any) => {
    const normalizedVideos = Array.isArray(videos)
      ? videos.map((video: any, index: number) => ({
          id: String(video.id || `${spriteId}_video_${index + 1}`),
          name: String(video.name || `Video ${index + 1}`),
          src: String(video.src || ""),
        }))
      : [];
    const normalizedCurrentVideoId = normalizedVideos.some(
      (video: any) => video.id === currentVideoId,
    )
      ? currentVideoId
      : normalizedVideos.length > 0
        ? normalizedVideos[0].id
        : null;
    return {
      videos: normalizedVideos,
      currentVideoId: normalizedCurrentVideoId,
    };
  };

  if (type === "text") {
    const { sounds, currentSoundId } = normalizeSounds(
      data.sounds,
      data.currentSoundId,
    );
    return { type, data: { ...data, sounds, currentSoundId } };
  }
  if (type === "video") {
    const { sounds, currentSoundId } = normalizeSounds(
      data.sounds,
      data.currentSoundId,
    );
    const { videos, currentVideoId } = normalizeVideos(
      data.videos,
      data.currentVideoId,
    );
    return {
      type,
      data: {
        ...data,
        sounds,
        currentSoundId,
        videos,
        currentVideoId,
        videoPlaying: data.videoPlaying ?? false,
        videoPlaybackRate: data.videoPlaybackRate ?? 1,
        videoVolume: data.videoVolume ?? 1,
        videoLoop: data.videoLoop ?? true,
        videoCurrentTime: data.videoCurrentTime ?? 0,
      },
    };
  }
  if (type === "media") {
    const images = Array.isArray(data.images)
      ? data.images
      : Array.isArray(data.costumes)
        ? data.costumes
        : [];
    const currentImageId = data.currentImageId ?? data.currentCostumeId;
    const normalizedImages =
      images.length > 0
        ? images.map((image: any, index: number) => ({
            id: String(image.id || `${spriteId}_image_${index + 1}`),
            name: String(image.name || `Image ${index + 1}`),
            src: String(image.src || ""),
          }))
        : [
            {
              id: `${spriteId}_image_1`,
              name: "Image 1",
              src: DEFAULT_MEDIA_SRC,
            },
          ];
    const normalizedCurrentImageId = normalizedImages.some(
      (image: any) => image.id === currentImageId,
    )
      ? currentImageId
      : normalizedImages[0].id;

    const { sounds, currentSoundId } = normalizeSounds(
      data.sounds,
      data.currentSoundId,
    );

    return {
      type,
      data: {
        images: normalizedImages,
        currentImageId: normalizedCurrentImageId,
        sounds,
        currentSoundId,
      },
    };
  }
  if ("src" in data) {
    const image = {
      id: `${spriteId}_image_1`,
      name: "Image 1",
      src: String(data.src || DEFAULT_MEDIA_SRC),
    };
    const { sounds, currentSoundId } = normalizeSounds([], null);
    const { videos, currentVideoId } = normalizeVideos([], null);
    return {
      type: "media",
      data: {
        images: [image],
        currentImageId: image.id,
        videos,
        currentVideoId,
        sounds,
        currentSoundId,
      },
    };
  }
  const image = {
    id: `${spriteId}_image_1`,
    name: "Image 1",
    src: DEFAULT_MEDIA_SRC,
  };
  const { sounds, currentSoundId } = normalizeSounds([], null);
  const { videos, currentVideoId } = normalizeVideos([], null);
  return {
    type: "media",
    data: { images: [image], currentImageId: image.id, videos, currentVideoId, sounds, currentSoundId },
  };
}
