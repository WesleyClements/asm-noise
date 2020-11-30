const generateNoiseValuesSync = ({ dimensions, scale, resolution, width, height }) => {
  const points = new Array(width * height);
  for (let i = 0; i < width; ++i) {
    for (let j = 0; j < height; ++j) {
      points[i + j * width] = [(i / resolution) * scale, (j / resolution) * scale];
      if (dimensions > 2) points[i + j * width].push((i / resolution) * scale);
      if (dimensions > 3) points[i + j * width].push((j / resolution) * scale);
    }
  }
  const values = new Float64Array(width * height);
  const start = (performance ?? Date).now();
  for (let i = 0; i < width; ++i) {
    for (let j = 0; j < height; ++j) {
      const index = i + j * width;
      values[index] = noise(...points[index]);
    }
  }
  const dt = (performance ?? Date).now() - start;
  return { dt, values };
};
