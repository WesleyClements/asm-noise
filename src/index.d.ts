// Type definitions for index.js
// Project: asm-noise
// Definitions by: Wesley Clements <https://github.com/WesleyClements>

export as namespace asmNoise;

declare module asmNoise {
  export = Noise;

  declare function Noise(x: number, y: number): number;
  declare function Noise(x: number, y: number, z: number): number;
  declare function Noise(x: number, y: number, z: number, z: number): number;

  declare namespace Noise {
    export interface NoiseOffset {
      x: number;
      y: number;
      z: number;
      w: number;
    }

    export let algorithm: 'perlin' | 'open-simplex';
    export let seed: number;
    export let octaves: number;
    export let lacunarity: number;
    export let persistence: number;
    export let offset: NoiseOffset;
  }
}
