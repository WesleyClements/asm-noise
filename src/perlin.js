import random from './random.js';

function Perlin(stdlib, foreign, heap) {
  'use asm';
  var SQRT2 = stdlib.Math.SQRT2;
  var SQRT1_2 = stdlib.Math.SQRT1_2;

  var floor = stdlib.Math.floor;
  var _setSeed = foreign.setSeed;
  var nextUint8 = foreign.nextUint8;
  var heapUint8 = new stdlib.Uint8Array(heap);

  function setSeed(value) {
    value = value | 0;
    var i = 0;
    var r = 0;
    var t = 0;

    _setSeed(value | 0);

    for (i = 0; (i | 0) < 0x100; i = (i + 1) | 0) {
      heapUint8[i] = i | 0;
    }
    for (i = 0; (i | 0) < 0x100; i = (i + 1) | 0) {
      r = nextUint8() | 0;
      t = heapUint8[i] | 0;
      heapUint8[i] = heapUint8[r] | 0;
      heapUint8[r] = heapUint8[t] | 0;
    }
    for (i = 0; (i | 0) < 0x100; i = (i + 1) | 0) {
      heapUint8[(i + 0x100) | 0] = heapUint8[i] | 0;
    }
  }

  function lerp(a, b, t) {
    a = +a;
    b = +b;
    t = +t;
    return +(a + (b - a) * t);
  }

  function fade(t) {
    t = +t;
    var result = 0.0;
    result = +(t * 6.0 - 15.0);
    result = +(t * result + 10.0);
    result = +(t * t * t * result);
    return +result;
  }

  function normalize(n) {
    n = +n;
    return (n + 1.0) / 2.0;
  }

  function grad2D(hash, x, y) {
    hash = hash | 0;
    x = +x;
    y = +y;
    var grad = 0.0;
    hash = hash & 0xf;
    switch (hash >> 2) {
      case 0b00:
        grad = (hash & 0b01 ? x : -x) + (hash & 0b10 ? y : -y);
        break;
      case 0b01:
        return hash & 0b01 ? x : -x;
      case 0b10:
        return hash & 0b10 ? y : -y;
      case 0b11:
        grad = (hash & 0b01 ? -x : x) + (hash & 0b10 ? -y : y);
        break;
    }
    return grad;
  }

  function eval2D(x, y) {
    x = +x;
    y = +y;
    var xi = 0;
    var yi = 0;
    var a = 0.0;
    var b = 0.0;

    var A = 0;
    var B = 0;

    xi = ~~floor(x) & 0xff;
    yi = ~~floor(y) & 0xff;
    x = x - floor(x);
    y = y - floor(y);
    a = +fade(x);
    b = +fade(y);

    A = (heapUint8[xi] + yi) | 0;
    B = (heapUint8[xi + 1] + yi) | 0;

    return +normalize(
      +lerp(
        +lerp(+grad2D(heapUint8[A] | 0, x, y), +grad2D(heapUint8[B] | 0, x - 1.0, y), a),
        +lerp(+grad2D(heapUint8[A + 1] | 0, x, y - 1.0), +grad2D(heapUint8[B + 1] | 0, x - 1.0, y - 1.0), a),
        b
      )
    );
  }

  function grad3D(hash, x, y, z) {
    hash = hash | 0;
    x = +x;
    y = +y;
    z = +z;
    var grad = 0.09;
    switch (hash & 0xf) {
      case 0:
        grad = x + y;
        break;
      case 1:
        grad = -x + y;
        break;
      case 2:
        grad = x - y;
        break;
      case 3:
        grad = -x - y;
        break;
      case 4:
        grad = x + z;
        break;
      case 5:
        grad = -x + z;
        break;
      case 6:
        grad = x - z;
        break;
      case 7:
        grad = -x - z;
        break;
      case 8:
        grad = y + z;
        break;
      case 9:
        grad = -y + z;
        break;
      case 10:
        grad = y - z;
        break;
      case 11:
        grad = -y - z;
        break;
      case 12:
        grad = y + x;
        break;
      case 13:
        grad = -x + y;
        break;
      case 14:
        grad = -y + z;
        break;
      case 15:
        grad = -y - z;
        break;
    }
    return grad;
  }

  function eval3D(x, y, z) {
    x = +x;
    y = +y;
    z = +z;
    var xi = 0;
    var yi = 0;
    var zi = 0;
    var a = 0.0;
    var b = 0.0;
    var c = 0.0;

    var A = 0;
    var B = 0;
    var AA = 0;
    var BA = 0;
    var AB = 0;
    var BB = 0;

    xi = ~~floor(x) & 0xff;
    yi = ~~floor(y) & 0xff;
    zi = ~~floor(z) & 0xff;
    x = x - floor(x);
    y = y - floor(y);
    z = z - floor(z);
    a = +fade(x);
    b = +fade(y);
    c = +fade(z);

    A = (heapUint8[xi] + yi) | 0;
    B = (heapUint8[xi + 1] + yi) | 0;
    AA = (heapUint8[A] + zi) | 0;
    BA = (heapUint8[B] + zi) | 0;
    AB = (heapUint8[A + 1] + zi) | 0;
    BB = (heapUint8[B + 1] + zi) | 0;

    return +normalize(
      +lerp(
        +lerp(
          +lerp(+grad3D(heapUint8[AA] | 0, x, y, z), +grad3D(heapUint8[BA] | 0, x - 1.0, y, z), a),
          +lerp(+grad3D(heapUint8[AB] | 0, x, y - 1.0, z), +grad3D(heapUint8[BB] | 0, x - 1.0, y - 1.0, z), a),
          b
        ),
        +lerp(
          +lerp(+grad3D(heapUint8[AA + 1] | 0, x, y, z - 1.0), +grad3D(heapUint8[BA + 1] | 0, x - 1.0, y, z - 1.0), a),
          +lerp(
            +grad3D(heapUint8[AB + 1] | 0, x, y - 1.0, z - 1.0),
            +grad3D(heapUint8[BB + 1] | 0, x - 1.0, y - 1.0, z - 1.0),
            a
          ),
          b
        ),
        c
      )
    );
  }

  function grad4D(hash, x, y, z, w) {
    hash = hash | 0;
    x = +x;
    y = +y;
    z = +z;
    w = +w;
    hash = hash & 0x1f;
    switch (hash >> 3) {
      case 0b01:
        return ((hash & 4) == 0 ? -w : w) + ((hash & 2) == 0 ? -x : x) + ((hash & 1) == 0 ? -y : y);
      case 0b10:
        return ((hash & 4) == 0 ? -z : z) + ((hash & 2) == 0 ? -w : w) + ((hash & 1) == 0 ? -x : x);
      case 0b11:
        return ((hash & 4) == 0 ? -y : y) + ((hash & 2) == 0 ? -z : z) + ((hash & 1) == 0 ? -w : w);
    }
    return ((hash & 4) == 0 ? -x : x) + ((hash & 2) == 0 ? -y : y) + ((hash & 1) == 0 ? -z : z);
  }

  function eval4D(x, y, z, w) {
    x = +x;
    y = +y;
    z = +z;
    w = +w;
    var xi = 0;
    var yi = 0;
    var zi = 0;
    var wi = 0;
    var a = 0.0;
    var b = 0.0;
    var c = 0.0;
    var d = 0.0;

    var A = 0;
    var B = 0;
    var AA = 0;
    var BA = 0;
    var AB = 0;
    var BB = 0;
    var AAA = 0;
    var BAA = 0;
    var ABA = 0;
    var BBA = 0;
    var AAB = 0;
    var BAB = 0;
    var ABB = 0;
    var BBB = 0;

    xi = ~~floor(x) & 0xff;
    yi = ~~floor(y) & 0xff;
    zi = ~~floor(z) & 0xff;
    wi = ~~floor(w) & 0xff;
    x = x - floor(x);
    y = y - floor(y);
    z = z - floor(z);
    w = w - floor(w);
    a = +fade(x);
    b = +fade(y);
    c = +fade(z);
    d = +fade(w);

    A = (heapUint8[xi] + yi) | 0;
    B = (heapUint8[xi + 1] + yi) | 0;
    AA = (heapUint8[A] + zi) | 0;
    BA = (heapUint8[B] + zi) | 0;
    AB = (heapUint8[A + 1] + zi) | 0;
    BB = (heapUint8[B + 1] + zi) | 0;
    AAA = (heapUint8[AA] + wi) | 0;
    BAA = (heapUint8[BA] + wi) | 0;
    ABA = (heapUint8[AB] + wi) | 0;
    BBA = (heapUint8[BB] + wi) | 0;
    AAB = (heapUint8[AA + 1] + wi) | 0;
    BAB = (heapUint8[BA + 1] + wi) | 0;
    ABB = (heapUint8[AB + 1] + wi) | 0;
    BBB = (heapUint8[BB + 1] + wi) | 0;
    return +normalize(
      +lerp(
        +lerp(
          +lerp(
            +lerp(+grad4D(heapUint8[AAA] | 0, x, y, z, w), +grad4D(heapUint8[BAA] | 0, x - 1.0, y, z, w), a),
            +lerp(
              +grad4D(heapUint8[ABA] | 0, x, y - 1.0, z, w),
              +grad4D(heapUint8[BBA] | 0, x - 1.0, y - 1.0, z, w),
              a
            ),
            b
          ),
          +lerp(
            +lerp(
              +grad4D(heapUint8[AAB] | 0, x, y, z - 1.0, w),
              +grad4D(heapUint8[BAB] | 0, x - 1.0, y, z - 1.0, w),
              a
            ),
            +lerp(
              +grad4D(heapUint8[ABB] | 0, x, y - 1.0, z - 1.0, w),
              +grad4D(heapUint8[BBB] | 0, x - 1.0, y - 1.0, z - 1.0, w),
              a
            ),
            b
          ),
          c
        ),
        +lerp(
          +lerp(
            +lerp(
              +grad4D(heapUint8[AAA + 1] | 0, x, y, z, w - 1.0),
              +grad4D(heapUint8[BAA + 1] | 0, x - 1.0, y, z, w - 1.0),
              a
            ),
            +lerp(
              +grad4D(heapUint8[ABA + 1] | 0, x, y - 1.0, z, w - 1.0),
              +grad4D(heapUint8[BBA + 1] | 0, x - 1.0, y - 1.0, z, w - 1.0),
              a
            ),
            b
          ),
          +lerp(
            +lerp(
              +grad4D(heapUint8[AAB + 1] | 0, x, y, z - 1.0, w - 1.0),
              +grad4D(heapUint8[BAB + 1] | 0, x - 1.0, y, z - 1.0, w - 1.0),
              a
            ),
            +lerp(
              +grad4D(heapUint8[ABB + 1] | 0, x, y - 1.0, z - 1.0, w - 1.0),
              +grad4D(heapUint8[BBB + 1] | 0, x - 1.0, y - 1.0, z - 1.0, w - 1.0),
              a
            ),
            b
          ),
          c
        ),
        d
      )
    );
  }

  return {
    setSeed: setSeed,
    eval2D: eval2D,
    eval3D: eval3D,
    eval4D: eval4D,
  };
}

const heap = new ArrayBuffer(0x10000);
const { setSeed, eval2D, eval3D, eval4D } = Perlin(
  {
    Math,
    Uint8Array,
  },
  {
    setSeed: (value) => (random.seed = value),
    nextUint8: random.nextUint8,
  },
  heap
);

let seed = Date.now();
setSeed(seed);

export default {
  set seed(value) {
    seed = value;
    setSeed(seed);
  },
  get seed() {
    return seed;
  },
  eval2D,
  eval3D,
  eval4D,
};
