self.onmessage = (e: MessageEvent) => {
  const { channelData, buckets } = e.data;
  const bucketSize = Math.max(1, Math.floor(channelData.length / buckets));
  const result = new Float32Array(buckets);
  
  for (let i = 0; i < buckets; i++) {
    let peak = 0;
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, channelData.length);
    for (let j = start; j < end; j++) {
      const v = Math.abs(channelData[j]);
      if (v > peak) peak = v;
    }
    result[i] = peak;
  }
  
  self.postMessage({ peaks: result }, [result.buffer] as any);
};
