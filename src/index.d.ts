// Type definitions for index.js
// Project: asm-noise
// Definitions by: Wesley Clements <https://github.com/WesleyClements>

declare module 'asm-noise' {
  function noise(x: number, y: number): number;
  function noise(x: number, y: number, z: number): number;
  function noise(x: number, y: number, z: number, w: number): number;

  export default noise;
}
