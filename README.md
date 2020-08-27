# asm-noise

[![npm version](https://badge.fury.io/js/asm-noise.svg)](https://badge.fury.io/js/asm-noise)

An implementation of noise algorithms in asm.js.

## Table of Contents

1.  [Installation](#installation)
1.  [Usage](#usage)
1.  [Options](#options)

## Goal and Philosophy

**`asm-noise`** endeavors to allow the fastest, most flexible multidimensional procedural noise generation possible with only JavaScript.

## [Installation](#installation)

Using npm:

```shell
npm install asm-noise
```

Using unpkg CDN:

```html
<script src="https://unpkg.com/asm-noise"></script>
```

## [Usage](#usage)

Supports both CommonJS and ES Modules.

```javascript
var noise = require('asm-noise');
```

```javascript
import noise from 'asm-noise';
```

When using CDN, functionality is exposed globally through `window.noise` .

Generate noise:

```javascript
var value2D = noise(0.1, 0.2);
var value3D = noise(0.1, 0.2, 0.3);
var value4D = noise(0.1, 0.2, 0.3, 0.4);
```

## [Options](#options)

| Property                 | Description                                                                      | Default        |
| ------------------------ | -------------------------------------------------------------------------------- | -------------- |
| **algorithm** (_String_) | Noise generation algorithm to be used. Possible values: `open-simplex`, `perlin` | `open-simplex` |
| **seed** (_Number_)      | Value used to seed the internal state of the current noise generation algorithm. | `Date.now()`   |

- **algorithm**: (_String_) Noise generation algorithm to be used. Possible values: `open-simplex`, `perlin` Default: `open-simplex`
- **seed**: (_Number_) Value used to seed the internal state of the current noise generation algorithm. Default: `Date.now()`

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
```
