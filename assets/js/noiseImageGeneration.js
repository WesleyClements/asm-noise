/* exported generateNoiseImageSync */
var generateNoiseImageSync = (() => {
  const getValueIndex = (resolution, resolutionX, i, j) => {
    return Math.floor(i * resolution) + Math.floor(j * resolution) * resolutionX;
  };
  return ({ dimensions, scale, resolution, width, height }) => {
    const resolutionX = Math.floor(width * resolution) + 1;
    const resolutionY = Math.floor(height * resolution) + 1;

    const points = new Array(resolutionX * resolutionY);
    for (let i = 0; i < resolutionX; ++i) {
      for (let j = 0; j < resolutionY; ++j) {
        const index = i + j * resolutionX;
        points[index] = [(i / resolution) * scale, (j / resolution) * scale];
        if (dimensions > 2) points[index].push((i / resolution) * scale);
        if (dimensions > 3) points[index].push((j / resolution) * scale);
      }
    }

    const noiseValues = new Float64Array(resolutionX * resolutionY);
    const start = (performance ?? Date).now();
    for (let i = 0; i < resolutionX; ++i) {
      for (let j = 0; j < resolutionY; ++j) {
        const index = i + j * resolutionX;
        noiseValues[index] = noise(...points[index]);
      }
    }
    const dt = (performance ?? Date).now() - start;

    const imgData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < imgData.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor(i / (4 * width));
      const value = 255 * noiseValues[getValueIndex(resolution, resolutionX, x, y)];
      imgData[i + 0] = value;
      imgData[i + 1] = value;
      imgData[i + 2] = value;
      imgData[i + 3] = 255;
    }

    return { dt, noiseValues, imgData: new ImageData(imgData, width, height) };
  };
})();
