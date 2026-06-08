import { Sprite, SpriteState } from './sprites';

const MAGIC = 'ANTIMONY';
const VERSION = 1;

interface Section {
	name: string;
	data: Uint8Array;
}

export async function serializeProject(projectName: string, state: SpriteState): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const sections: Section[] = [];

	// metadata stuff
	const metadata = `name:${projectName}\nversion:${VERSION}`;
	sections.push({ name: 'metadata', data: encoder.encode(metadata) });

	// state
	const stateBuffer = serializeState(state, encoder);
	sections.push({ name: 'state', data: stateBuffer });

	// header, version, etc
	const headerSize = 14;
	const sectionEntrySize = 24;
	const manifestSize = sections.length * sectionEntrySize;
	
	let currentOffset = headerSize + manifestSize;
	const totalSize = currentOffset + sections.reduce((sum, s) => sum + s.data.length, 0);

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);

	// write the header
	for (let i = 0; i < MAGIC.length; i++) {
		view.setUint8(i, MAGIC.charCodeAt(i));
	}
	view.setUint16(8, VERSION);
	view.setUint32(10, sections.length);

	// write the manifest and the data
	let manifestPos = 14;
	for (const section of sections) {
		const nameBytes = encoder.encode(section.name.slice(0, 16));
		for (let i = 0; i < 16; i++) {
			view.setUint8(manifestPos + i, i < nameBytes.length ? nameBytes[i] : 0);
		}
		view.setUint32(manifestPos + 16, currentOffset);
		view.setUint32(manifestPos + 20, section.data.length);
		
		new Uint8Array(buffer, currentOffset, section.data.length).set(section.data);
		
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

function serializeSpriteData(data: any, encoder: TextEncoder): Uint8Array {
	const entries = Object.entries(data);
	const parts: Uint8Array[] = [];
	
	const countBuf = new Uint8Array(4);
	new DataView(countBuf.buffer).setUint32(0, entries.length);
	parts.push(countBuf);

	for (const [k, v] of entries) {
		parts.push(serializeString(k, encoder));
		parts.push(serializeString(String(v), encoder));
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

export async function deserializeProject(buffer: ArrayBuffer): Promise<{ projectName: string, state: SpriteState }> {
	const view = new DataView(buffer);
	const decoder = new TextDecoder();

	let magic = '';
	for (let i = 0; i < 8; i++) magic += String.fromCharCode(view.getUint8(i));
	if (magic !== MAGIC) throw new Error('Invalid project file');

	const version = view.getUint16(8);
	const sectionCount = view.getUint32(10);

	let projectName = 'Untitled Project';
	let state: SpriteState = { sprites: [], selectedSpriteId: null, loadKey: 0 };

	let manifestPos = 14;
	for (let i = 0; i < sectionCount; i++) {
		const nameBytes = new Uint8Array(buffer, manifestPos, 16);
		const name = decoder.decode(nameBytes).replace(/\0/g, '');
		const offset = view.getUint32(manifestPos + 16);
		const length = view.getUint32(manifestPos + 20);

		const data = new Uint8Array(buffer, offset, length);

		if (name === 'metadata') {
			const metaStr = decoder.decode(data);
			const lines = metaStr.split('\n');
			for (const line of lines) {
				const [k, v] = line.split(':');
				if (k === 'name') projectName = v;
			}
		} else if (name === 'state') {
			state = deserializeState(data);
		}

		manifestPos += 24;
	}

	return { projectName, state };
}

function deserializeState(data: Uint8Array): SpriteState {
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

		sprites.push({
			id: id.str,
			name: name.str,
			type: type.str,
			x, y, width, height, rotation, opacity, visible, locked, zIndex,
			data: dataRes.data,
			blocklyXml: blocklyXml.str
		});
	}

	return {
		sprites,
		selectedSpriteId: sprites.length > 0 ? sprites[0].id : null,
		loadKey: 0
	};
}

function deserializeString(view: DataView, offset: number, decoder: TextDecoder): { str: string, bytes: Uint8Array } {
	const len = view.getUint32(offset);
	const bytes = new Uint8Array(view.buffer, view.byteOffset + offset + 4, len);
	return { str: decoder.decode(bytes), bytes };
}

function deserializeSpriteData(view: DataView, offset: number, decoder: TextDecoder): { data: any, newOffset: number } {
	const count = view.getUint32(offset);
	let currentOffset = offset + 4;
	const data: any = {};

	for (let i = 0; i < count; i++) {
		const key = deserializeString(view, currentOffset, decoder);
		currentOffset += 4 + key.bytes.length;

		const val = deserializeString(view, currentOffset, decoder);
		currentOffset += 4 + val.bytes.length;

		const v = val.str;
		if (v === 'true') data[key.str] = true;
		else if (v === 'false') data[key.str] = false;
		else if (!isNaN(Number(v)) && v.trim() !== '') data[key.str] = Number(v);
		else data[key.str] = v;
	}

	return { data, newOffset: currentOffset };
}
