importScripts("https://unpkg.com/asm-noise@1.0.2/dist/asm-noise.js");
importScripts("./noiseImageGeneration.js");
/*global generateNoiseImageSync */
addEventListener("message", (ev) => {
  const { seed, algorithm, ...settings } = ev.data;
  noise.config({ seed, algorithm });
  const { dt, noiseValues, imgData } = generateNoiseImageSync(settings);
  console.log(dt);
  postMessage({ dt, noiseValues, imgData }, [noiseValues.buffer, imgData.data.buffer]);
});
