import { useState } from "react";
import { RESOLUTION_PRESETS, DEFAULT_PROJECT_SETTINGS } from "../lib/settings";

export function Resolution({width, height, label, callback, selected}: {width: number, height: number, label: string, callback: () => void, selected: boolean}) {
  return (
    <div className={`resolution-item ${selected ? "active" : ""}`} onClick={callback} style={{ aspectRatio: width / height }}>
      <span>{label}</span>
      <p>{width} x {height}</p>
    </div>
  );
}

export function ResolutionEdit({width, height, callback, selected}: {width: number, height: number, callback: (w: number, h: number) => void, selected: boolean}) {
  return (
    <div className={`resolution-item ${selected ? "active" : ""}`} style={{ aspectRatio: width / height }}>
      <span>Custom</span>
      <div className="resolution-input">
        <input style={{ textAlign: "right" }} type="number" value={width} onChange={(e) => {
          callback(Number(e.target.value), height);
        }} />
        <p>x</p>
        <input type="number" value={height} onChange={(e) => {
          callback(width, Number(e.target.value));
        }} />
      </div>
    </div>
  );
}