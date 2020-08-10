import perlin from "./src/perlin.js";

const canvas = document.getElementById('display');
canvas.width = innerWidth
canvas.height = innerHeight
const ctx = canvas.getContext('2d');

const imageData = ctx.createImageData(512, 512);


const start = Date.now();

for (let i = 0; i < imageData.width; i++) {
  for (let j = 0; j < imageData.height; j++) {
    const offset = 4 * (imageData.width * j + i);
    const value = perlin.perlin3D(i / 32, j / 32, 0.3);
    imageData.data[offset + 0] = value * 255;
    imageData.data[offset + 1] = value * 255;
    imageData.data[offset + 2] = value * 255;
    imageData.data[offset + 3] = 255;
  }
}

console.log((Date.now() - start) / 1000);

ctx.putImageData(imageData, 0, 0);
