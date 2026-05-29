export type SourceType = 'image' | 'text' | 'video' | 'audio' | 'shape';

interface SourceBase {
    id: string;
    name: string;
    blocklyXml: string;
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
}

export interface ImageSourceData {
    src: string;
}

export interface TextSourceData {
    content: string;
    font: string;
    size: number;
    color: string;
}

export interface VideoSourceData {
    src: string;
    startTime: number;
    endTime?: number;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
}

export interface AudioSourceData {
    src: string;
    startTime: number;
    endTime?: number;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
}

export interface ShapeSourceData {
    shape: 'rect' | 'ellipse';
    fill: string;
    stroke?: string;
    strokeWidth?: number;
}

export interface ImageSource extends SourceBase {
    type: 'image';
    data: ImageSourceData;
}

export interface TextSource extends SourceBase {
    type: 'text';
    data: TextSourceData;
}

export interface VideoSource extends SourceBase {
    type: 'video';
    data: VideoSourceData;
}

export interface AudioSource extends SourceBase {
    type: 'audio';
    data: AudioSourceData;
}

export interface ShapeSource extends SourceBase {
    type: 'shape';
    data: ShapeSourceData;
}

export type Source = ImageSource | TextSource | VideoSource | AudioSource | ShapeSource;