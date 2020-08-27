import perlin from './perlin.js';
import openSimplexUnoptimized from './openSimplexUnoptimized.js';

let noise;

{
  const algorithms = new Map([
    ['perlin', perlin],
    ['open-simplex', openSimplexUnoptimized],
  ]);

  let algorithm = 'open-simplex';
  let octaves = 8;
  let lacunarity = (1 + Math.sqrt(5)) / 2;
  let persistence = Math.abs(1 - Math.sqrt(5)) / 2;

  let offset;
  {
    let offsetX = 5393 * lacunarity;
    let offsetY = 4691 * lacunarity;
    let offsetZ = 10093 * lacunarity;
    let offsetW = 9241 * lacunarity;
    offset = {
      get x() {
        return offsetX;
      },
      set x(value) {
        if (typeof value !== 'number') throw TypeError('must be a number');
        offsetX = value;
      },
      get y() {
        return offsetY;
      },
      set y(value) {
        if (typeof value !== 'number') throw TypeError('must be a number');
        offsetY = value;
      },
      get z() {
        return offsetZ;
      },
      set z(value) {
        if (typeof value !== 'number') throw TypeError('must be a number');
        offsetZ = value;
      },
      get w() {
        return offsetW;
      },
      set w(value) {
        if (typeof value !== 'number') throw TypeError('must be a number');
        offsetW = value;
      },
    };
  }

  noise = function (x, y, z, w) {
    if (arguments.length < 2) return;
    switch (arguments.length) {
      case 2:
        return algorithms.get(algorithm).noise2D(octaves, lacunarity, persistence, offset.x, offset.y, x, y);
      case 3:
        return algorithms
          .get(algorithm)
          .noise3D(octaves, lacunarity, persistence, offset.x, offset.y, offset.z, x, y, z);
      default:
        return algorithms
          .get(algorithm)
          .noise4D(octaves, lacunarity, persistence, offset.x, offset.y, offset.z, offset.w, x, y, z, w);
    }
  };

  Object.defineProperties(noise, {
    algorithm: {
      get: () => algorithm,
      set: (value) => {
        if (typeof value !== 'string') throw TypeError('algorithm must be a string');
        value = value.toLowerCase();
        if (!algorithms.has(value)) throw Error(`invalid algorithm: ${value}`);
        algorithm = value;
      },
    },
    seed: {
      get: () => algorithms.get(algorithm).seed,
      set: (value) => {
        algorithms.get(algorithm).seed = value;
      },
    },
    octaves: {
      get: () => octaves,
      set: (value) => {
        if (typeof value !== 'number') throw TypeError('octave must be a number');
        if (value < 1) throw RangeError('octave must greater than 0');
        octaves = value;
      },
    },
    lacunarity: {
      get: () => lacunarity,
      set: (value) => {
        if (typeof value !== 'number') throw TypeError('lacunarity must be a number');
        if (value === 0) throw RangeError('lacunarity must not be 0');
        lacunarity = value;
      },
    },
    persistence: {
      get: () => persistence,
      set: (value) => {
        if (typeof value !== 'number') throw TypeError('persistence must be a number');
        if (value === 0) throw RangeError('persistence must not be 0');
        persistence = value;
      },
    },
    offset: {
      get: () => offset,
    },
  });
}

export default noise;
