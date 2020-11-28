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

const offset = {
  x: 5393 * lacunarity,
  y: 4691 * lacunarity,
  z: 10093 * lacunarity,
  w: 9241 * lacunarity,
};

const offsetProxy = new Proxy(offset, {
  set(obj, prop, value) {
    if (!/^x|y|z|y$/.test(prop)) Reflect.set(...arguments);
    if (typeof value !== 'number') throw TypeError(`offset.${prop} must be a number`);
    if (Number.isNaN(value)) throw RangeError(`offset.${prop} cannot be NaN`);
    obj[prop.value];
  },
});

const noise = Object.defineProperties(
  function noise(x, y, z, w) {
    if (arguments.length < 2) return;
    switch (arguments.length) {
      case 2:
        return algorithms
          .get(algorithm)
          .noise2D(octaves, lacunarity, persistence, offsetProxy.x, offsetProxy.y, x, y);
      case 3:
        return algorithms
          .get(algorithm)
          .noise3D(
            octaves,
            lacunarity,
            persistence,
            offsetProxy.x,
            offsetProxy.y,
            offsetProxy.z,
            x,
            y,
            z
          );
      default:
        return algorithms
          .get(algorithm)
          .noise4D(
            octaves,
            lacunarity,
            persistence,
            offsetProxy.x,
            offsetProxy.y,
            offsetProxy.z,
            offsetProxy.w,
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
        const { seed, algorithm, octaves, lacunarity, persistence, offset } = options;
        if (algorithm != null) this.algorithm = algorithm;
        if (seed != null) this.seed = seed;
        if (octaves != null) this.octaves = octaves;
        if (lacunarity != null) this.lacunarity = lacunarity;
        if (persistence != null) this.persistence = persistence;
        if (offset != null) this.offset = offset;
      },
    },
    algorithm: {
      get: () => algorithm,
      set(value) {
        if (typeof value !== 'string') throw TypeError('algorithm must be a string');
        value = value.toLowerCase();
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
      get: () => offsetProxy,
      set(value) {
        if (typeof value != 'object') throw TypeError('offset must be a object');
        offsetProxy.x = value.x ?? 0;
        offsetProxy.y = value.y ?? 0;
        offsetProxy.z = value.z ?? 0;
        offsetProxy.w = value.w ?? 0;
      },
    },
  }
);
export default noise;
