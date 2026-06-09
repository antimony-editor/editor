import * as Muxer from 'mp4-muxer';
import * as WebMMuxer from 'webm-muxer';

self.onmessage = async (e: MessageEvent) => {
	const { options, frames, width, height, fps } = e.data;

	try {
		if (options.format === 'gif') {
			self.postMessage({ type: 'error', error: 'so uhh.. this is awkward. i couldnt find a way for GIF exporting to work on a thread, so this is what you get. TODO: fix this' });
			return;
		}

		const MuxerClass = (options.format === 'mp4' ? Muxer.Muxer : WebMMuxer.Muxer) as any;
		const target = new (options.format === 'mp4' ? Muxer.ArrayBufferTarget : WebMMuxer.ArrayBufferTarget)();
		
		const muxer = new MuxerClass({
			target,
			video: {
				codec: options.format === 'mp4' ? 'avc' : 'vp9',
				width,
				height,
			},
			fastStart: options.format === 'mp4' ? 'in-memory' : undefined,
		});

		const videoEncoder = new VideoEncoder({
			output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
			error: (err) => self.postMessage({ type: 'error', error: err.message }),
		});

		videoEncoder.configure({
			codec: options.format === 'mp4' ? 'avc1.640033' : 'vp09.00.10.08',
			width,
			height,
			bitrate: options.bitrate,
			framerate: fps,
			latencyMode: options.quality,
		});

		for (let i = 0; i < frames.length; i++) {
			const bitmap = frames[i];
			const timestamp = Math.floor((i * 1000000) / fps);
			const frame = new VideoFrame(bitmap, { timestamp });
			videoEncoder.encode(frame, { keyFrame: i % 60 === 0 });
			frame.close();
			bitmap.close();
			
			if (i % 10 === 0) {
				self.postMessage({ type: 'progress', progress: (i / frames.length) * 100 });
			}
		}

		await videoEncoder.flush();
		videoEncoder.close();
		muxer.finalize();

		const buffer = target.buffer;
		(self as any).postMessage({ type: 'done', buffer }, [buffer]);
	} catch (err: any) {
		(self as any).postMessage({ type: 'error', error: err.message });
	}
};
