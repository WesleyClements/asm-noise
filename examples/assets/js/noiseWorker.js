importScripts('https://unpkg.com/asm-noise');
importScripts('./noiseImageGeneration.js');
/*global generateNoiseImageSync */
addEventListener('message', (ev) => {
  const { seed, algorithm, ...settings } = ev.data;
  noise.config({ seed, algorithm });
  const { dt, noiseValues, imgData } = generateNoiseImageSync(settings);
  console.log(dt);
  postMessage({ dt, noiseValues, imgData }, [noiseValues.buffer, imgData.data.buffer]);
});
