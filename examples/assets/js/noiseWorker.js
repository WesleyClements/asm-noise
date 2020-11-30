importScripts('https://unpkg.com/asm-noise@1.0.2/dist/asm-noise.js');
importScripts('./noiseImageGeneration.js');

addEventListener('message', (ev) => {
  const { scale, resolution, width, height } = ev.data;
  const { dt, noiseValues, imgData } = generateNoiseImageSync({ scale, resolution, width, height });
  console.log(dt);
  postMessage({ dt, noiseValues, imgData }, [noiseValues.buffer, imgData.data.buffer]);
});
