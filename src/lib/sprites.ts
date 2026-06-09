import { createContext, useContext, type Dispatch } from 'react';
import { DEFAULT_TWEEN_MODE, type TweenMode, type TweenableProperty } from './tween';

export interface TextSpriteData {
	content: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: number;
	color: string;
	align: 'left' | 'center' | 'right';
}

export const DEFAULT_MEDIA_SRC = '/default_sprite.svg';

export interface MediaImage {
	id: string;
	name: string;
	src: string;
}

export interface MediaSpriteData {
	images: MediaImage[];
	currentImageId: string | null;
}

export type SpriteData = TextSpriteData | MediaSpriteData;

export type SpriteType = 'text' | 'media';

export interface Sprite {
	id: string;
	name: string;
	type: SpriteType;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	opacity: number;
	visible: boolean;
	locked: boolean;
	zIndex: number;
	tweenMode: TweenMode;
	tweenModes: Partial<Record<TweenableProperty, TweenMode>>;
	data: SpriteData;
	blocklyXml: string;
}

export type SpriteAction =
	| { type: 'ADD_SPRITE'; sprite: Sprite }
	| { type: 'REMOVE_SPRITE'; id: string }
	| { type: 'UPDATE_SPRITE'; id: string; changes: Partial<Omit<Sprite, 'id' | 'type'>> }
	| { type: 'SELECT_SPRITE'; id: string | null }
	| { type: 'REORDER_SPRITE'; id: string; newIndex: number }
	| { type: 'DUPLICATE_SPRITE'; id: string }
	| { type: 'LOAD_PROJECT'; state: SpriteState };

export interface SpriteState {
	sprites: Sprite[];
	selectedSpriteId: string | null;
	loadKey: number;
}

let nextId = 1;

export function generateSpriteId(): string {
	return `sprite_${Date.now()}_${nextId++}`;
}

export function generateMediaImageId(): string {
	return `image_${Date.now()}_${nextId++}`;
}

export function createTextSprite(name: string): Sprite {
	return {
		id: generateSpriteId(),
		name,
		type: 'text',
		x: 0,
		y: 0,
		width: 533,
		height: 107,
		rotation: 0,
		opacity: 1,
		visible: true,
		locked: false,
		zIndex: 0,
		tweenMode: DEFAULT_TWEEN_MODE,
		tweenModes: {},
		blocklyXml: '',
		data: {
			content: 'Antimony!',
			fontFamily: 'Inter',
			fontSize: 64,
			fontWeight: 400,
			color: '#ffffff',
			align: 'center',
		} as TextSpriteData,
	};
}

export function createMediaSprite(name: string): Sprite {
	const imageId = generateMediaImageId();
	return {
		id: generateSpriteId(),
		name,
		type: 'media',
		x: 0,
		y: 0,
		width: (195.49078 * 3),
		height: (59.46922 * 3),
		rotation: 0,
		opacity: 1,
		visible: true,
		locked: false,
		zIndex: 0,
		tweenMode: DEFAULT_TWEEN_MODE,
		tweenModes: {},
		blocklyXml: '',
		data: {
			images: [{ id: imageId, name: 'Image 1', src: DEFAULT_MEDIA_SRC }],
			currentImageId: imageId,
		} as MediaSpriteData,
	};
}

const defaultTextSprite = createTextSprite('Text 1');

export const initialSpriteState: SpriteState = {
	sprites: [defaultTextSprite],
	selectedSpriteId: defaultTextSprite.id,
	loadKey: 0,
};

export function spriteReducer(state: SpriteState, action: SpriteAction): SpriteState {
	switch (action.type) {
		case 'ADD_SPRITE': {
			return {
				...state,
				sprites: [...state.sprites, { ...action.sprite, zIndex: state.sprites.length }],
				selectedSpriteId: action.sprite.id,
			};
		}
		case 'REMOVE_SPRITE': {
			const filtered = state.sprites.filter(s => s.id !== action.id);
			return {
				...state,
				sprites: filtered,
				selectedSpriteId: state.selectedSpriteId === action.id
					? (filtered.length > 0 ? filtered[filtered.length - 1].id : null)
					: state.selectedSpriteId,
			};
		}
		case 'UPDATE_SPRITE': {
			return {
				...state,
				sprites: state.sprites.map(s =>
					s.id === action.id ? { ...s, ...action.changes } : s
				),
			};
		}
		case 'SELECT_SPRITE': {
			return { ...state, selectedSpriteId: action.id };
		}
		case 'REORDER_SPRITE': {
			const sprites = [...state.sprites];
			const idx = sprites.findIndex(s => s.id === action.id);
			if (idx === -1) return state;
			const [moved] = sprites.splice(idx, 1);
			const newIndex = Math.max(0, Math.min(action.newIndex, sprites.length));
			sprites.splice(newIndex, 0, moved);
			return {
				...state,
				sprites: sprites.map((s, i) => ({ ...s, zIndex: i })),
			};
		}
		case 'DUPLICATE_SPRITE': {
			const original = state.sprites.find(s => s.id === action.id);
			if (!original) return state;
			const dupe: Sprite = {
				...original,
				id: generateSpriteId(),
				name: `${original.name} Copy`,
				x: original.x + 20,
				y: original.y + 20,
				zIndex: state.sprites.length,
				tweenModes: { ...original.tweenModes },
				data: { ...original.data },
			};
			return {
				...state,
				sprites: [...state.sprites, dupe],
				selectedSpriteId: dupe.id,
			};
		}
		case 'LOAD_PROJECT': {
			return {
				...action.state,
				sprites: action.state.sprites.map((sprite) => ({
					...sprite,
					tweenMode: sprite.tweenMode ?? DEFAULT_TWEEN_MODE,
					tweenModes: sprite.tweenModes ?? {},
				})),
				loadKey: state.loadKey + 1,
			};
		}
		default:
			return state;
	}
}

export interface SpriteContextValue {
	state: SpriteState;
	dispatch: Dispatch<SpriteAction>;
}

export const SpriteContext = createContext<SpriteContextValue | null>(null);

export function useSprites(): SpriteContextValue {
	const ctx = useContext(SpriteContext);
	if (!ctx) throw new Error('useSprites must be used within SpriteProvider');
	return ctx;
}

export function isTextData(data: SpriteData): data is TextSpriteData {
	return 'content' in data && 'fontFamily' in data;
}

export function isMediaData(data: SpriteData): data is MediaSpriteData {
	return 'images' in data && 'currentImageId' in data;
}