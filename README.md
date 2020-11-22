# asm-noise

[![npm version](https://badge.fury.io/js/asm-noise.svg)](https://badge.fury.io/js/asm-noise)

An implementation of noise algorithms in asm.js.

## Table of Contents

1. [Installation](#installation)
1. [Usage](#usage)
1. [Options](#options)
1. [Roadmap](#roadmap)
1. [Contributing](#contributing)
1. [Acknowledgments](#acknowledgments)
1. [License](#license)

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

Noise generation options can be set directly or by passing an options object into `noise.config`

```javascript
noise.config({ ...options... });

noise.algorithm = 'open-simplex';
noise.seed = Date.now();
noise.octaves = 8;
noise.lacunarity = (1 + Math.sqrt(5)) / 2;
noise.persistence = (Math.sqrt(5) - 1) / 2;
noise.offset = {
  x: (5393 * (1 + Math.sqrt(5))) / 2,
  y: (4691 * (1 + Math.sqrt(5))) / 2,
  z: (10093 * (1 + Math.sqrt(5))) / 2,
  w: (9241 * (1 + Math.sqrt(5))) / 2,
};
```

### `algorithm`

Type: `String`

Noise generation algorithm to be used.
Possible values: `open-simplex`, `perlin`

Default: `'open-simplex'`

### `seed`

Type: `Number`

Default: `'open-simplex'`

Value used to seed the internal state of the current noise generation algorithm.

Default: `Date.now()`

### `octaves`

Type: `Number`

Number of itterations of noise to sum together when generating noise at single point.

Default: `8`

### `lacunarity`

Type: `Number`

On the nth generation itteration, the generation point is scaled by this value raised to the nth power.

Default: `(1 + Math.sqrt(5)) / 2`

### `persistence`

Type: `Number`

On the nth generation itteration, the nth noise value is scaled by this value raised to the nth power.

Default: `(Math.sqrt(5) - 1) / 2`

### `offset`

Type: `{ x: Number; y: Number; z: Number; w: Number; }`

Contains axis specific values to add to the generation point between generation itterations.

Default:

```javascript
{
  x: (5393 * (1 + Math.sqrt(5))) / 2,
  y: (4691 * (1 + Math.sqrt(5))) / 2,
  z: (10093 * (1 + Math.sqrt(5))) / 2,
  w: (9241 * (1 + Math.sqrt(5))) / 2,
  }
```

## [Roadmap](#roadmap)

- Improve performance of algorithms
- Implement additional algorithms
- Add batch generation

## [Contributing](#contributing)

Pull requests are welcome.

To implement a new noise generation algorithm:

1. Create a file in the `src` directory with the name of the algorithm.
1. This file should be an ES Module.
1. The deafult export of this file should be an object with following properties:

- ```javascript
  seed: number;
  ```
- ```javascript
  noise2D: function(octaves, lacunarity, persistence, xOffset, yOffset, x, y) => number
  ```
- ```javascript
  noise3D: function(octaves, lacunarity, persistence, xOffset, yOffset, zOffset, x, y, z) => number
  ```
- ```javascript
  noise4D: function(octaves, lacunarity, persistence, xOffset, yOffset, zOffset, wOffset, x, y, z, w) => number
  ```

## [Acknowledgments](#acknowledgments)

Many thanks to [@KdotJPG](https://github.com/KdotJPG) for the creation of OpenSimplex noise algorithm.

## [License](#license)

This project is licensed under the terms of the MIT license.
