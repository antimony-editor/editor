import { useState } from "react";

import "../styles/editor.css";
import { useSprites } from "../lib/sprites";
import { Plus } from "lucide-react";
import {
  generateMediaSoundId,
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
  // @ts-ignore
  if (!sprite?.data.images) {
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
        Text types are not supported for image tab
      </div>
    );
  }
  // @ts-ignore
  const activeItem = sprite?.data.images[audioIDX];
  const { show } = useContextMenu({ id: MENU_ID });
  const updateImage = (id: string, changes: Record<string, unknown>) => {
    if (!sprite) return;
    dispatch({
      type: "UPDATE_SPRITE",
      id: sprite.id,
      changes: {
        data: {
          ...sprite.data,
          // @ts-ignore we already know it will
          images: sprite.data.images.map((s, j) =>
            j === audioIDX ? { ...s, ...changes } : s,
          ),
        },
      },
    });
  };

  // @ts-ignore
  if (!sprite?.data.images) {
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
        Text types are not supported for image tab
      </div>
    );
  }

  const update = (changes: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_SPRITE", id: sprite.id, changes });
  };

  const updateMediaData = (
    data: MediaSpriteData,
    extraChanges: Record<string, unknown> = {},
  ) => {
    update({ ...extraChanges, data });
  };

  const readImageFile = (file: File, replace?: boolean, iId?: string) => {
    if (!isMediaData(sprite.data)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const isVideo = file.type.startsWith("video/");
      let imageId = "";
      if (replace && iId) imageId = iId;
      else imageId = generateMediaImageId();

      let newImages: MediaImage[] = [];

      if (!replace) {
        const newImage = {
          id: imageId,
          //@ts-ignore
          name:
            file.name.replace(/\.[^.]+$/, "") ||
            "Image " + (sprite.data.images.length + 1),
          src,
        };

        // @ts-ignore
        newImages = [...sprite.data.images, newImage];
      } else {
        // @ts-ignore
        newImages = sprite.data.images;
      }

      update({
        data: {
          ...sprite.data,
          images: newImages,
          currentImageId: imageId,
        },
      });

      if (isVideo) {
        const video = document.createElement("video");
        video.src = src;
        video.onloadedmetadata = () => {
          if (!isMediaData(sprite.data)) return;
          const nextData: MediaSpriteData = {
            ...sprite.data,
            currentImageId: imageId,
            images: newImages.map((image) =>
              image.id === imageId
                ? {
                    ...image,
                    src,
                    name:
                      image.name ||
                      file.name.replace(/\.[^.]+$/, "") ||
                      "Video",
                  }
                : image,
            ),
          };
          updateMediaData(nextData, {
            width: Math.max(5, video.videoWidth || sprite.width),
            height: Math.max(5, video.videoHeight || sprite.height),
          });
        };
        video.onerror = () => {
          if (!isMediaData(sprite.data)) return;
          updateMediaData({
            ...sprite.data,
            currentImageId: imageId,
            images: newImages.map((image) =>
              image.id === imageId ? { ...image, src } : image,
            ),
          });
        };
      } else {
        const image = new window.Image();
        image.onload = () => {
          if (!isMediaData(sprite.data)) return;
          const nextData: MediaSpriteData = {
            ...sprite.data,
            currentImageId: imageId,
            images: newImages.map((image) =>
              image.id === imageId
                ? {
                    ...image,
                    src,
                    name:
                      image.name ||
                      file.name.replace(/\.[^.]+$/, "") ||
                      "Image",
                  }
                : image,
            ),
          };
          updateMediaData(nextData, {
            width: Math.max(5, image.naturalWidth || sprite.width),
            height: Math.max(5, image.naturalHeight || sprite.height),
          });
        };
        image.onerror = () => {
          if (!isMediaData(sprite.data)) return;
          updateMediaData({
            ...sprite.data,
            currentImageId: imageId,
            images: newImages.map((image) =>
              image.id === imageId ? { ...image, src } : image,
            ),
          });
        };
        image.src = src;
      }

      setAudioIDX(newImages.length - 1);
    };
    reader.readAsDataURL(file);
  };

  const newImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readImageFile(file);
    };
    input.click();
  };

  const replaceImage = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readImageFile(file, true, id);
    };
    input.click();
  };

  return (
    <div className="sound-tab">
      <div className="sound-tab-side">
        {// @ts-ignore
        sprite?.data.images.map((s, i) => (
          <button
            key={i}
            className={
              i == audioIDX ? "sound-tab-sound-selected" : "sound-tab-sound"
            }
            onClick={() => {
              setAudioIDX(i);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              show({
                event: e,
                props: {
                  soundIndex: i,
                  sound: s,
                },
              });
            }}
          >
            <img
              src={s.src}
              style={{ aspectRatio: "1/1", width: "40px", height: "40px" }}
            />
            <span>{s.name}</span>
          </button>
        ))}
        <Menu id={MENU_ID}>
          <Item
            onClick={(e) => {
              const newName = prompt("What's the new name?");
              if (!newName) return;
              updateImage(e.props.sound.id, { name: newName });
            }}
          >
            Quick rename
          </Item>
          <Item
            onClick={(e) => {
              replaceImage(e.props.sound.id);
            }}
          >
            Quick replace
          </Item>
          {
            //@ts-ignore
            sprite?.data.images.length > 1 ? (
              <Item
                onClick={(e) => {
                  //@ts-ignore
                  let imagesRemoved = sprite.data.images.filter(
                    (i) => i.id !== e.props.sound.id,
                  );

                  dispatch({
                    type: "UPDATE_SPRITE",
                    id: sprite.id,
                    changes: {
                      data: {
                        ...sprite.data,
                        images: imagesRemoved,
                      },
                    },
                  });
                }}
                style={{ color: "red", fontWeight: "bold" }}
              >
                Delete
              </Item>
            ) : null
          }
        </Menu>

        <button
          className="sound-tab-sound-new"
          onClick={() => {
            newImage();
          }}
        >
          <Plus style={{ height: "40px", width: "40px" }} />
          <span>Add image</span>
        </button>
      </div>
      <div className="sound-tab-editor">
        {sprite == undefined || activeItem == undefined ? (
          /* taken from blocklyeditor lol */
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              pointerEvents: "all",
              textAlign: "center",
              userSelect: "none",
              boxSizing: "border-box",
            }}
          >
            Select a source to view and edit its images or select an image
          </div>
        ) : (
          <div className="sound-tab-editor-inner">
            <div className="properties-row" style={{ marginRight: "450px" }}>
              <span className="properties-label">Name</span>
              <input
                className="properties-input"
                type="text"
                value={activeItem.name}
                onChange={(e) => {
                  updateImage(activeItem.id, { name: e.target.value });
                }}
                onBlur={() => {
                  if (activeItem.name.trim() !== "") return;
                  updateImage(activeItem.id, {
                    name: "Image " + (audioIDX + 1),
                  });
                }}
              />
            </div>
            {/* TODO: replace with actual editor */}
            <img
              src={activeItem.src}
              style={{ aspectRatio: "1/1", width: "100%", height: "100%" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
