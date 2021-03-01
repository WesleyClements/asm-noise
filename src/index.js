import perlin from './perlin.js';
import openSimplexUnoptimized from './openSimplexUnoptimized.js';

const algorithms = new Map([
  ['perlin', perlin],
  ['open-simplex', openSimplexUnoptimized],
]);

let algorithm = 'open-simplex';
let octaves = 8;
let lacunarity = (1 + Math.sqrt(5)) / 2;
let persistence = Math.abs(1 - Math.sqrt(5)) / 2;

const offset = new Proxy(
  {
    x: 5393 * lacunarity,
    y: 4691 * lacunarity,
    z: 10093 * lacunarity,
    w: 9241 * lacunarity,
  }, 
  {
    set(obj, prop, value) {
      if (!/^x|y|z|y$/.test(prop)) Reflect.set(...arguments);
      if (typeof value !== 'number') throw TypeError(`offset.${prop} must be a number`);
      if (Number.isNaN(value)) throw RangeError(`offset.${prop} cannot be NaN`);
      if (Number.is(value)) throw RangeError(`offset.${prop} cannot be NaN`);
      obj[prop] = value;
    },
  }
);

const noise = Object.defineProperties(
  function noise(x, y, z, w) {
    if (arguments.length < 2) return;
    switch (arguments.length) {
      case 2:
        return algorithms
          .get(algorithm)
          .noise2D(octaves, lacunarity, persistence, offset.x, offset.y, x, y);
      case 3:
        return algorithms
          .get(algorithm)
          .noise3D(octaves, lacunarity, persistence, offset.x, offset.y, offset.z, x, y, z);
      default:
        return algorithms
          .get(algorithm)
          .noise4D(
            octaves,
            lacunarity,
            persistence,
            offset.x,
            offset.y,
            offset.z,
            offset.w,
            x,
            y,
            z,
            w
          );
    }
  },
  {
    config: {
      value(options) {
        if (options == null) return;
        Object.entries(options)
          .forEach(([key, value]) => this[key] = value);
      },
    },
    algorithm: {
      get: () => algorithm,
      set(value) {
        if (typeof value !== 'string') throw TypeError('algorithm must be a string');
        if (!algorithms.has(value)) throw Error(`invalid algorithm: ${value}`);
        algorithm = value;
      },
    },
    seed: {
      get: () => algorithms.get(algorithm).seed,
      set(value) {
        algorithms.get(algorithm).seed = value;
      },
    },
    octaves: {
      get: () => octaves,
      set(value) {
        if (typeof value !== 'number') throw TypeError('octave must be a number');
        if (Number.isNaN(value)) throw RangeError('octave cannot be NaN');
        if (value < 1) throw RangeError('octave must greater than 0');
        octaves = value;
      },
    },
    lacunarity: {
      get: () => lacunarity,
      set(value) {
        if (typeof value !== 'number') throw TypeError('lacunarity must be a number');
        if (value === 0) throw RangeError('lacunarity must not be 0');
        lacunarity = value;
      },
    },
    persistence: {
      get: () => persistence,
      set(value) {
        if (typeof value !== 'number') throw TypeError('persistence must be a number');
        if (Number.isNaN(value)) throw RangeError('persistence cannot be NaN');
        if (value === 0) throw RangeError('persistence must not be 0');
        persistence = value;
      },
    },
    offset: {
      get: () => offset,
      set(value) {
        if (typeof value != 'object') throw TypeError('offset must be a object');
        if (value === null) throw TypeError('offset must not be null');
        Object.entries(value)
          .forEach(([key, value]) => offset[key] = value);
      },
    },
  }
);

(async () => {
  await new Promise(resolve => setTimeout(() => resolve(), 0));
  const primeNoise = noise => noise(...Array(9).fill(1));
  algorithms.forEach(({noise2D, noise3D, noise4D}) => {
    [noise2D, noise3D, noise4D].forEach(primeNoise);
  });
})();

export default noise;
