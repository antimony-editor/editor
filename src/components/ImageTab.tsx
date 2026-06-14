import { useState } from "react";

import "../styles/editor.css";
import { useSprites } from "../lib/sprites";
import { Plus } from "lucide-react";
import {
  isMediaData,
  type MediaSpriteData,
  generateMediaImageId,
  type MediaImage,
} from "../lib/sprites";
import { Menu, Item, useContextMenu } from "react-contexify";

const MENU_ID = "image-menu";

export default function ImageTab() {
  const { state, dispatch } = useSprites();
  const sprite = state.sprites.find((s) => s.id === state.selectedSpriteId);
  const [audioIDX, setAudioIDX] = useState(0);
  const { show } = useContextMenu({ id: MENU_ID });

  if (!sprite || !isMediaData(sprite.data)) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          color: "var(--text-secondary)",
          fontSize: "13px",
          fontWeight: 500,
          pointerEvents: "all",
          textAlign: "center",
          userSelect: "none",
          boxSizing: "border-box",
        }}
      >
        Only image sources are supported for the image tab
      </div>
    );
  }

  const activeItem = sprite.data.images[audioIDX];

  const updateImage = (id: string, changes: Partial<MediaImage>) => {
    if (!sprite || !isMediaData(sprite.data)) return;
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          images: sprite.data.images.map((img) =>
            img.id === id ? { ...img, ...changes } : img,
          ),
        },
      },
    });
  };

  const updateMediaData = (
    data: MediaSpriteData,
    extraChanges: Record<string, unknown> = {},
  ) => {
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: { ...extraChanges, data },
    });
  };

  const readImageFile = (file: File, replaceId?: string) => {
    if (!isMediaData(sprite.data)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const imageId = replaceId || generateMediaImageId();
      let newImages: MediaImage[] = [];

      if (!replaceId) {
        const newImage = {
          id: imageId,
          name: file.name.replace(/\.[^.]+$/, "") || "Image " + (sprite.data.images.length + 1),
          src,
        };
        newImages = [...sprite.data.images, newImage];
      } else {
        newImages = sprite.data.images.map(img => img.id === imageId ? { ...img, src, name: file.name.replace(/\.[^.]+$/, "") } : img);
      }

      const imageElement = new window.Image();
      imageElement.onload = () => {
        if (!isMediaData(sprite.data)) return;
        const nextData: MediaSpriteData = {
          ...sprite.data,
          currentImageId: imageId,
          images: newImages,
        };
        updateMediaData(nextData, {
          width: Math.max(5, imageElement.naturalWidth || sprite.width),
          height: Math.max(5, imageElement.naturalHeight || sprite.height),
        });
      };
      imageElement.onerror = () => {
        if (!isMediaData(sprite.data)) return;
        updateMediaData({
          ...sprite.data,
          currentImageId: imageId,
          images: newImages,
        });
      };
      imageElement.src = src;

      if (!replaceId) setAudioIDX(newImages.length - 1);
    };
    reader.readAsDataURL(file);
  };

  const newImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readImageFile(file);
    };
    input.click();
  };

  const replaceImage = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readImageFile(file, id);
    };
    input.click();
  };

  return (
    <div className="sound-tab">
      <div className="sound-tab-side">
        {sprite.data.images.map((s, i) => (
          <button
            key={s.id}
            className={i === audioIDX ? "sound-tab-sound-selected" : "sound-tab-sound"}
            onClick={() => setAudioIDX(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              show({ event: e, props: { image: s } });
            }}
          >
            <img src={s.src} style={{ aspectRatio: "1/1", width: "40px", height: "40px" }} />
            <span>{s.name}</span>
          </button>
        ))}
        <Menu id={MENU_ID}>
          <Item onClick={(e) => {
            const newName = prompt("New name?", e.props.image.name);
            if (newName) updateImage(e.props.image.id, { name: newName });
          }}>Rename</Item>
          <Item onClick={(e) => replaceImage(e.props.image.id)}>Replace</Item>
          {sprite.data.images.length > 1 && (
            <Item
              onClick={(e) => {
                const nextImages = sprite.data.images.filter(img => img.id !== e.props.image.id);
                dispatch({
                  type: "UPDATE_SPRITE",
                  id: sprite.id,
                  changes: {
                    data: {
                      ...sprite.data,
                      images: nextImages,
                      currentImageId: sprite.data.currentImageId === e.props.image.id ? nextImages[0].id : sprite.data.currentImageId
                    }
                  }
                });
                setAudioIDX(0);
              }}
              style={{ color: "red" }}
            >
              Delete
            </Item>
          )}
        </Menu>
        <button className="sound-tab-sound-new" onClick={newImage}>
          <Plus style={{ height: "40px", width: "40px" }} />
          <span>Add image</span>
        </button>
      </div>
      <div className="sound-tab-editor">
        {!activeItem ? (
          <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
            Select an image source to view and edit its images
          </div>
        ) : (
          <div className="sound-tab-editor-inner">
            <div className="properties-row" style={{ marginRight: "450px" }}>
              <span className="properties-label">Name</span>
              <input
                className="properties-input"
                type="text"
                value={activeItem.name}
                onChange={(e) => updateImage(activeItem.id, { name: e.target.value })}
              />
            </div>
            <img src={activeItem.src} style={{ aspectRatio: "1/1", width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        )}
      </div>
    </div>
  );
}
