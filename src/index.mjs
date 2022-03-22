import algorithms, { defaultAlgorithm } from './algorithms/index.mjs';

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

const algorithmMap = new Map(Object.entries(algorithms));
const algorithmArray = Array.from(algorithmMap.keys()).sort();

const settings = {
  algorithm: defaultAlgorithm,
  octaves: 8,
  lacunarity: GOLDEN_RATIO,
  persistence: GOLDEN_RATIO - 1,
  offset: new Proxy(
    {
      x: 5393 * GOLDEN_RATIO,
      y: 4691 * GOLDEN_RATIO,
      z: 10093 * GOLDEN_RATIO,
      w: 9241 * GOLDEN_RATIO,
    },
    {
      set(obj, prop, value) {
        if (!['x','y','z','w'].includes(prop)) Reflect.set(obj, prop, value);
        if (typeof value !== 'number') throw TypeError(`offset.${prop} must be a number`);
        if (Number.isNaN(value)) throw RangeError(`offset.${prop} cannot be NaN`);
        obj[prop] = value;
      },
    }
  ),
};

const getNoiseFunc = (dimensions) => {
  switch (dimensions) {
  case 2:
    return algorithmMap.get(settings.algorithm).noise2D;
  case 3:
    return algorithmMap.get(settings.algorithm).noise3D;
  default:
    return algorithmMap.get(settings.algorithm).noise4D;
  }
};

const noise = Object.defineProperties(
  function noise(x, y, z, w) {
    const dimensions = arguments.length;
    if (dimensions < 2) return;
    const noiseFunc = getNoiseFunc(dimensions);
    return noiseFunc(
      settings.octaves,
      settings.lacunarity,
      settings.persistence,
      settings.offset.x,
      settings.offset.y,
      x,
      y,
      z,
      w
    );
  },
  {
    config: {
      value(options) {
        if (options == null) return;
        Object.entries(options)
          .filter(([key]) => Reflect.has(settings, key))
          .forEach(([key, value]) => this[key] = value);
        return; 
      },
    },
    algorithms: {
      get: () => Array.from(algorithmArray),
    },
    algorithm: {
      get: () => settings.algorithm,
      set(value) {
        if (typeof value !== 'string') throw TypeError('algorithm must be a string');
        if (!algorithmMap.has(value)) throw Error(`invalid algorithm: ${value}`);
        settings.algorithm = value;
      },
    },
    seed: {
      get: () => algorithmMap.get(settings.algorithm).seed,
      set(value) {
        algorithmMap.get(settings.algorithm).seed = value;
      },
    },
    octaves: {
      get: () => settings.octaves,
      set(value) {
        if (typeof value !== 'number') throw TypeError('octave must be a number');
        if (Number.isNaN(value)) throw RangeError('octave cannot be NaN');
        if (!Number.isInteger(value)) throw RangeError('octave must be integer');
        if (value < 1) throw RangeError('octave must greater than 0');
        settings.octaves = value;
      },
    },
    lacunarity: {
      get: () => settings.lacunarity,
      set(value) {
        if (typeof value !== 'number') throw TypeError('lacunarity must be a number');
        if (Number.isNaN(value)) throw RangeError('lacunarity cannot be NaN');
        if (value === 0) throw RangeError('lacunarity must not be 0');
        settings.lacunarity = value;
      },
    },
    persistence: {
      get: () => settings.persistence,
      set(value) {
        if (typeof value !== 'number') throw TypeError('persistence must be a number');
        if (Number.isNaN(value)) throw RangeError('persistence cannot be NaN');
        if (value === 0) throw RangeError('persistence must not be 0');
        settings.persistence = value;
      },
    },
    offset: {
      get: () => settings.offset,
      set(value) {
        if (typeof value != 'object') throw TypeError('offset must be a object');
        if (value === null) throw TypeError('offset must not be null');
        Object.entries(value)
          .filter(([key]) => Reflect.has(settings, key))
          .forEach(([key, value]) => settings.offset[key] = value);
      },
    },
  }
);

void setTimeout(() => {
  const primeNoise = noise => noise(...Array(9).fill(1));
  algorithmMap.forEach(({ noise2D, noise3D, noise4D }) => {
    [noise2D, noise3D, noise4D].forEach(primeNoise);
  });
}, 0);

export default noise;
