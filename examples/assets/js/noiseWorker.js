importScripts('https://unpkg.com/asm-noise@1.0.2/dist/asm-noise.js');
importScripts('./noiseGeneration.js');

addEventListener('message', (ev) => {
  console.log(ev, noise);
  const { scale, resolution, width, height } = ev.data;
  const { dt, values } = generateNoiseValuesSync({ scale, resolution, width, height });
  console.log(dt);
  postMessage({ dt, values }, [values.buffer]);
});
