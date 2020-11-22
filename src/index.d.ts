// Type definitions for index.js
// Project: asm-noise
// Definitions by: Wesley Clements <https://github.com/WesleyClements>
declare type ASMNoiseOptions = {
  seed?: number;
  algorithm?: 'perlin' | 'open-simplex';
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
  offset?: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
};

declare module 'asm-noise' {
  function noise(x: number, y: number): number;
  function noise(x: number, y: number, z: number): number;
  function noise(x: number, y: number, z: number, w: number): number;
  namespace noise {
    export let seed: number;
    export let algorithm: 'perlin' | 'open-simplex';
    export let octaves: number;
    export let lacunarity: number;
    export let persistence: number;
    export let offset: {
      x: number;
      y: number;
      z: number;
      w: number;
    };
    export function config(options: ASMNoiseOptions);
  }
  export default noise;
}
