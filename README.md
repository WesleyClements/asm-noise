# asm-noise

[![npm version](https://badge.fury.io/js/asm-noise.svg)](https://badge.fury.io/js/asm-noise)

An implementation of noise algorithms in asm.js.

## Table of Contents

1.  [Installation](#installation)
2.  [Usage](#usage)

## Goal and Philosophy

**`asm-noise`** endeavors to allow the fastest, most flexible multidimensional procedural noise generation possible with only JavaScript.

## [Installation](#installation)

```shell
npm install asm-noise
```

```html
<script src="https://unpkg.com/browse/asm-noise@latest/"></script>
```

## [Usage](#usage)

```javascript
// set algorithm out of ['perlin', 'open-simplex']
asmNoise.algorithm = 'open-simplex';

// set seed
asmNoise.seed = Date.now();

// set octaves
asmNoise.octaves = 8;
// set lacunarity
asmNoise.lacunarity = (1 + Math.sqrt(5)) / 2;
// set persistence
asmNoise.persistence = (1 - Math.sqrt(5)) / 2;

// set offset
asmNoise.offset.x = 0.1;
asmNoise.offset.y = 0.2;
asmNoise.offset.z = 0.3;
asmNoise.offset.w = 0.4;

var value2D = asmNoise(0.1, 0.2);
var value3D = asmNoise(0.1, 0.2, 0.3);
var value4D = asmNoise(0.1, 0.2, 0.3, 0.4);
```
