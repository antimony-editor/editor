import { useState, useMemo, useEffect, useRef } from "react";
import { useSprites } from "../lib/sprites";
import { Plus, Replace, Trash2 } from "lucide-react";
import {
  isMediaData,
  isVideoData,
  type MediaSpriteData,
  type VideoSpriteData,
  generateMediaVideoId,
  type MediaVideo,
} from "../lib/sprites";
import { Menu, Item, useContextMenu } from "react-contexify";
import { Plyr } from "plyr-react";
import "plyr/dist/plyr.css";

const MENU_ID = "video-menu";

function VideoThumbnail({ src }: { src: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!src) return;

    const video = document.createElement("video");
    video.src = src;
    video.crossOrigin = "anonymous";
    video.currentTime = 0.1;
    video.muted = true;
    video.playsInline = true;

    const onSeeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL());
      }
      video.removeEventListener("seeked", onSeeked);
    };

    video.addEventListener("seeked", onSeeked);
    video.load();

    return () => {
      video.removeEventListener("seeked", onSeeked);
    };
  }, [src]);

  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      {thumbnail ? (
        <img src={thumbnail} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: "10px", color: "#fff" }}>VID</span>
      )}
    </div>
  );
}

export default function VideoTab() {
  const { state, dispatch } = useSprites();
  const sprite = state.sprites.find((s) => s.id === state.selectedSpriteId);
  const [videoIDX, setVideoIDX] = useState(0);
  const { show } = useContextMenu({ id: MENU_ID });

  if (!sprite || !isVideoData(sprite.data)) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          fontSize: "13px",
          fontWeight: 500,
          textAlign: "center",
          userSelect: "none",
        }}
      >
        Only video sources are supported for the video tab
      </div>
    );
  }

  const activeItem = sprite.data.videos[videoIDX];

  const plyrSource = useMemo(() => {
    if (!activeItem?.src) return null;
    return {
      type: "video" as const,
      sources: [{ src: activeItem.src }],
    };
  }, [activeItem?.src]);

  const updateVideo = (id: string, changes: Partial<MediaVideo>) => {
    if (!sprite || !isVideoData(sprite.data)) return;
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          videos: sprite.data.videos.map((v: MediaVideo) =>
            v.id === id ? { ...v, ...changes } : v,
          ),
        },
      },
    });
  };

  const updateMediaData = (
    data: any,
    extraChanges: Record<string, unknown> = {},
  ) => {
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: { ...extraChanges, data },
    });
  };

  const readVideoFile = (file: File, replaceId?: string) => {
    if (!sprite || !isVideoData(sprite.data)) return;
    const currentData = sprite.data;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const videoId = replaceId || generateMediaVideoId();
      let newVideos: MediaVideo[] = [];

      if (!replaceId) {
        const newVideo = {
          id: videoId,
          name: file.name.replace(/\.[^.]+$/, "") || "Video " + (currentData.videos.length + 1),
          src,
        };
        newVideos = [...currentData.videos, newVideo];
      } else {
        newVideos = currentData.videos.map((v: MediaVideo) => v.id === videoId ? { ...v, src, name: file.name.replace(/\.[^.]+$/, "") } : v);
      }

      const videoElement = document.createElement("video");
      videoElement.src = src;
      videoElement.onloadedmetadata = () => {
        if (!sprite || !isVideoData(sprite.data)) return;
        const nextData = {
          ...currentData,
          currentVideoId: videoId,
          videos: newVideos,
        };
        updateMediaData(nextData, {
          width: Math.max(5, videoElement.videoWidth || sprite.width),
          height: Math.max(5, videoElement.videoHeight || sprite.height),
        });
      };
      videoElement.onerror = () => {
        if (!sprite || !isVideoData(sprite.data)) return;
        updateMediaData({
          ...currentData,
          currentVideoId: videoId,
          videos: newVideos,
        });
      };

      if (!replaceId) setVideoIDX(newVideos.length - 1);
    };
    reader.readAsDataURL(file);
  };

  const addNewVideo = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readVideoFile(file);
    };
    input.click();
  };

  const replaceVideo = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readVideoFile(file, id);
    };
    input.click();
  };

  const handleDeleteVideo = (id: string) => {
    if (!sprite || !isVideoData(sprite.data) || sprite.data.videos.length <= 1) return;
    const nextVideos = sprite.data.videos.filter((v: MediaVideo) => v.id !== id);
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          videos: nextVideos,
          currentVideoId: sprite.data.currentVideoId === id ? nextVideos[0].id : sprite.data.currentVideoId,
        },
      },
    });
    setVideoIDX(0);
  };

  return (
    <div className="asset-tab">
      <div className="asset-sidebar">
        <div className="asset-list">
          {sprite.data.videos.map((v, i) => (
            <div
              key={v.id}
              className={`asset-card ${i === videoIDX ? "selected" : ""}`}
              onClick={() => setVideoIDX(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                show({ event: e, props: { video: v } });
              }}
            >
              <div className="asset-card-preview">
                <VideoThumbnail src={v.src} />
              </div>
              <div className="asset-card-info">
                <span className="asset-card-name">{v.name}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="asset-sidebar-footer">
          <button className="add-sprite-btn" onClick={addNewVideo}>
            <Plus size={14} /> Add Video
          </button>
        </div>
      </div>

      <div className="asset-editor">
        {activeItem ? (
          <>
            <div className="asset-editor-header">
              <input
                className="asset-editor-name-input"
                type="text"
                value={activeItem.name}
                onChange={(e) => updateVideo(activeItem.id, { name: e.target.value })}
              />
              <div className="media-actions">
                <button className="properties-btn" onClick={() => replaceVideo(activeItem.id)}>
                  <Replace size={14} /> Replace
                </button>
                <button
                  className="properties-btn danger"
                  disabled={sprite.data.videos.length <= 1}
                  onClick={() => handleDeleteVideo(activeItem.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
            <div className="asset-editor-body">
              <div className="asset-main-preview">
                {plyrSource && <Plyr source={plyrSource} options={{ autoplay: false, pip: false } as any} />}
              </div>
            </div>
          </>
        ) : (
          <div className="asset-empty-state">
            <p>Select a video to preview</p>
          </div>
        )}
      </div>

      <Menu id={MENU_ID}>
        <Item onClick={(e) => {
          const newName = prompt("New name?", e.props.video.name);
          if (newName) updateVideo(e.props.video.id, { name: newName });
        }}>Rename</Item>
        <Item onClick={(e) => replaceVideo(e.props.video.id)}>Replace</Item>
        <Item onClick={(e) => handleDeleteVideo(e.props.video.id)} style={{ color: "var(--danger)" }}>Delete</Item>
      </Menu>
    </div>
  );
}