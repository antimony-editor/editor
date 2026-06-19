import { useState } from "react";
import { useSprites } from "../lib/sprites";
import { Plus, Trash2, Replace, ImageIcon, Search } from "lucide-react";
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
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { show } = useContextMenu({ id: MENU_ID });

  if (!sprite || !isMediaData(sprite.data)) {
    return (
      <div className="asset-empty-state">
        <ImageIcon size={48} />
        <p>Only image sources are supported for the image tab</p>
      </div>
    );
  }

  const activeItem = sprite.data.images[selectedIdx];

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
    if (!sprite || !isMediaData(sprite.data)) return;
    const currentData = sprite.data;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const imageId = replaceId || generateMediaImageId();
      let newImages: MediaImage[] = [];

      if (!replaceId) {
        const newImage = {
          id: imageId,
          name: file.name.replace(/\.[^.]+$/, "") || "Image " + (currentData.images.length + 1),
          src,
        };
        newImages = [...currentData.images, newImage];
      } else {
        newImages = currentData.images.map((img: MediaImage) => img.id === imageId ? { ...img, src, name: file.name.replace(/\.[^.]+$/, "") } : img);
      }

      const imageElement = new window.Image();
      imageElement.onload = () => {
        if (!sprite || !isMediaData(sprite.data)) return;
        const nextData: MediaSpriteData = {
          ...currentData,
          currentImageId: imageId,
          images: newImages,
        };
        updateMediaData(nextData, {
          width: Math.max(5, imageElement.naturalWidth || sprite.width),
          height: Math.max(5, imageElement.naturalHeight || sprite.height),
        });
      };
      imageElement.onerror = () => {
        if (!sprite || !isMediaData(sprite.data)) return;
        updateMediaData({
          ...currentData,
          currentImageId: imageId,
          images: newImages,
        });
      };
      imageElement.src = src;

      if (!replaceId) setSelectedIdx(newImages.length - 1);
    };
    reader.readAsDataURL(file);
  };

  const handleAddImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readImageFile(file);
    };
    input.click();
  };

  const handleReplaceImage = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readImageFile(file, id);
    };
    input.click();
  };

  const handleDeleteImage = (id: string) => {
    if (!sprite || !isMediaData(sprite.data) || sprite.data.images.length <= 1) return;
    const nextImages = sprite.data.images.filter((img) => img.id !== id);
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          images: nextImages,
          currentImageId: sprite.data.currentImageId === id ? nextImages[0].id : sprite.data.currentImageId
        }
      }
    });
    setSelectedIdx(0);
  };

  return (
    <div className="asset-tab">
      <div className="asset-sidebar">
        <div className="asset-list">
          {sprite.data.images.map((img, i) => (
            <div
              key={img.id}
              className={`asset-card ${i === selectedIdx ? "selected" : ""}`}
              onClick={() => setSelectedIdx(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                show({ event: e, props: { image: img } });
              }}
            >
              <div className="asset-card-preview">
                <img src={img.src} alt={img.name} />
              </div>
              <div className="asset-card-info">
                {editingId === img.id ? (
                  <input
                    autoFocus
                    className="asset-card-name-input"
                    value={img.name}
                    onChange={(e) => updateImage(img.id, { name: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingId(null);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="asset-card-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIdx(i);
                      setEditingId(img.id);
                    }}
                  >
                    {img.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="asset-sidebar-footer">
          <button className="add-sprite-btn" onClick={handleAddImage}>
            <Plus size={14} /> Add Image
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
                onChange={(e) => updateImage(activeItem.id, { name: e.target.value })}
              />
              <div className="media-actions">
                <button className="properties-btn" onClick={() => handleReplaceImage(activeItem.id)}>
                  <Replace size={14} /> Replace
                </button>
                <button
                  className="properties-btn danger"
                  disabled={sprite.data.images.length <= 1}
                  onClick={() => handleDeleteImage(activeItem.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
            <div className="asset-editor-body">
              <div className="asset-main-preview">
                <img src={activeItem.src} alt={activeItem.name} />
              </div>
            </div>
          </>
        ) : (
          <div className="asset-empty-state">
            <p>Select an image to view and edit</p>
          </div>
        )}
      </div>

      <Menu id={MENU_ID}>
        <Item onClick={(e) => {
          const newName = prompt("New name?", e.props.image.name);
          if (newName) updateImage(e.props.image.id, { name: newName });
        }}>Rename</Item>
        <Item onClick={(e) => handleReplaceImage(e.props.image.id)}>Replace</Item>
        <Item onClick={(e) => handleDeleteImage(e.props.image.id)} style={{ color: "var(--danger)" }}>Delete</Item>
      </Menu>
    </div>
  );
}
