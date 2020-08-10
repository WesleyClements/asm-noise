import random from "./random.js";
const heap = new ArrayBuffer(0x10000);

function Perlin(stdlib, foreign, heap) {
  'use asm';
  var floor = stdlib.Math.floor;
  var _setSeed = foreign.setSeed;
  var nextUint8 = foreign.nextUint8;
  var heapU8 = new stdlib.Uint8Array(heap);

  function setSeed(value) {
    value = value | 0;
    var i = 0;
    var swap = 0;
    var temp = 0;

    _setSeed(value | 0);

    for (i = 0; (i | 0) < 0x100; i = (i + 1) | 0) {
      heapU8[i] = i | 0;
    }
    for (i = 0; (i | 0) < 0x100; i = (i + 1) | 0) {
      swap = nextUint8() | 0;
      temp = heapU8[i] | 0;
      heapU8[i] = heapU8[swap] | 0;
      heapU8[swap] = heapU8[temp] | 0;
    }
    for (i = 0; (i | 0) < 0x100; i = (i + 1) | 0) {
      heapU8[(i + 0x100) | 0] = heapU8[i] | 0;
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
    return +(n + 1.0) / 2.0;
  }

  function grad2D(hash, x, y) {
    hash = hash | 0;
    x = +x;
    y = +y;
    return (hash & 1 ? x : -x) + (hash & 2 ? y : -y);
  }
  function perlin2D(x, y) {
    x = +x;
    y = +y;
    var xi = 0;
    var yi = 0;
    var a = 0.0;
    var b = 0.0;

    var A = 0;
    var B = 0;

    xi = (~~floor(x) - ~~floor(x / 256.0)) | 0;
    yi = (~~floor(y) - ~~floor(y / 256.0)) | 0;
    x = +(x - floor(x));
    y = +(y - floor(y));
    a = +fade(x);
    b = +fade(y);

    A = (heapU8[xi] + yi) | 0;
    B = (heapU8[xi + 1] + yi) | 0;

    return +normalize(
      +lerp(
        +lerp(
          +grad2D(heapU8[A] | 0, x, y),
          +grad2D(heapU8[B] | 0, +(x - 1.0), y),
          a
        ),
        +lerp(
          +grad2D(heapU8[A + 1] | 0, x, +(y - 1.0)),
          +grad2D(heapU8[B + 1] | 0, +(x - 1.0), +(y - 1.0)),
          a
        ),
        b,
      )
    );
  }

  function grad3D(hash, x, y, z) {
    hash = hash | 0;
    x = +x;
    y = +y;
    z = +z;
    var h = 0;
    var u = 0.0;
    var v = 0.0;

    h = hash & 0xf;
    u = (h | 0) < 8 ? x : y;
    v = (
      (h | 0) < 4
        ? y
        : (
          ((h | 0) == 12 | (h | 0) == 14)
            ? x
            : z
        )
    );
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
  }
  function perlin3D(x, y, z) {
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

    var x1 = 0.0;
    var x2 = 0.0;
    var y1 = 0.0;
    var y2 = 0.0;

    xi = (~~floor(x) - ~~floor(x / 256.0)) | 0;
    yi = (~~floor(y) - ~~floor(y / 256.0)) | 0;
    zi = (~~floor(z) - ~~floor(z / 256.0)) | 0;
    x = +(x - floor(x));
    y = +(y - floor(y));
    z = +(z - floor(z));
    a = +fade(x);
    b = +fade(y);
    c = +fade(z);

    A = (heapU8[xi] + yi) | 0;
    B = (heapU8[xi + 1] + yi) | 0;
    AA = (heapU8[A] + zi) | 0;
    BA = (heapU8[B] + zi) | 0;
    AB = (heapU8[A + 1] + zi) | 0;
    BB = (heapU8[B + 1] + zi) | 0;

    x1 = +lerp(+grad3D(heapU8[AA] | 0, x, y, z), +grad3D(heapU8[BA] | 0, +(x - 1.0), y, z), a);
    x2 = +lerp(+grad3D(heapU8[AB] | 0, x, +(y - 1.0), z), +grad3D(heapU8[BB] | 0, +(x - 1.0), +(y - 1.0), z), a);
    y1 = +lerp(x1, x2, b);

    x1 = +lerp(+grad3D(heapU8[AA + 1] | 0, x, y, +(z - 1.0)), +grad3D(heapU8[BA + 1] | 0, +(x - 1.0), y, +(z - 1.0)), a);
    x2 = +lerp(
      +grad3D(heapU8[AB + 1] | 0, x, +(y - 1.0), +(z - 1.0)),
      +grad3D(heapU8[BB + 1] | 0, +(x - 1.0), +(y - 1.0), +(z - 1.0)),
      a,
    );
    y2 = +lerp(x1, x2, b);

    return +normalize(+lerp(y1, y2, c));
  }
  function grad4D(hash, x, y, z, w) {
    hash = hash | 0;
    x = +x;
    y = +y;
    z = +z;
    w = +w;
    var a = 0.0;
    var b = 0.0;
    var c = 0.0;
    hash = hash & 0x20;
    a = y;
    b = z;
    c = w;
    switch (hash >> 3) {
      case 1:
        a = w;
        b = x;
        c = y;
        break;
      case 2:
        a = z;
        b = w;
        c = x;
        break;
      case 3:
        a = y;
        b = z;
        c = w;
        break;
    }
    return ((hash & 4) == 0 ? -a : a) + ((hash & 2) == 0 ? -b : b) + ((hash & 1) == 0 ? -c : c);
  }
  function perlin4D(x, y, z, w) {
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

    xi = (~~floor(x) - ~~floor(x / 256.0)) | 0;
    yi = (~~floor(y) - ~~floor(y / 256.0)) | 0;
    zi = (~~floor(z) - ~~floor(z / 256.0)) | 0;
    wi = (~~floor(w) - ~~floor(w / 256.0)) | 0;
    x = +(x - floor(x));
    y = +(y - floor(y));
    z = +(z - floor(z));
    w = +(w - floor(w));
    a = +fade(x);
    b = +fade(y);
    c = +fade(z);
    d = +fade(w);

    A = (heapU8[xi] + yi) | 0;
    B = (heapU8[xi + 1] + yi) | 0;
    AA = (heapU8[A] + zi) | 0;
    BA = (heapU8[B] + zi) | 0;
    AB = (heapU8[A + 1] + zi) | 0;
    BB = (heapU8[B + 1] + zi) | 0;
    AAA = (heapU8[AA] + wi) | 0;
    BAA = (heapU8[BA] + wi) | 0;
    ABA = (heapU8[AB] + wi) | 0;
    BBA = (heapU8[BB] + wi) | 0;
    AAB = (heapU8[AA + 1] + wi) | 0;
    BAB = (heapU8[BA + 1] + wi) | 0;
    ABB = (heapU8[AB + 1] + wi) | 0;
    BBB = (heapU8[BB + 1] + wi) | 0;
    return +normalize(
      +lerp(
        +lerp(
          +lerp(
            +lerp(
              +grad4D(heapU8[AAA] | 0, x, y, z, w),
              +grad4D(heapU8[BAA] | 0, +(x - 1.0), y, z, w),
              a
            ),
            +lerp(
              +grad4D(heapU8[ABA] | 0, x, +(y - 1.0), z, w),
              +grad4D(heapU8[BBA] | 0, +(x - 1.0), +(y - 1.0), z, w),
              a,
            ),
            b,
          ),
          +lerp(
            +lerp(
              +grad4D(heapU8[AAB] | 0, x, y, +(z - 1.0), w),
              +grad4D(heapU8[BAB] | 0, +(x - 1.0), y, +(z - 1.0), w),
              a,
            ),
            +lerp(
              +grad4D(heapU8[ABB] | 0, x, +(y - 1.0), +(z - 1.0), w),
              +grad4D(heapU8[BBB] | 0, +(x - 1.0), +(y - 1.0), +(z - 1.0), w),
              a,
            ),
            b,
          ),
          c,
        ),
        +lerp(
          +lerp(
            +lerp(
              +grad4D(heapU8[AAA + 1] | 0, x, y, z, +(w - 1.0)),
              +grad4D(heapU8[BAA + 1] | 0, +(x - 1.0), y, z, +(w - 1.0)),
              a,
            ),
            +lerp(
              +grad4D(heapU8[ABA + 1] | 0, x, +(y - 1.0), z, +(w - 1.0)),
              +grad4D(heapU8[BBA + 1] | 0, +(x - 1.0), +(y - 1.0), z, +(w - 1.0)),
              a,
            ),
            b,
          ),
          +lerp(
            +lerp(
              +grad4D(heapU8[AAB + 1] | 0, x, y, +(z - 1.0), +(w - 1.0)),
              +grad4D(heapU8[BAB + 1] | 0, +(x - 1.0), y, +(z - 1.0), +(w - 1.0)),
              a,
            ),
            +lerp(
              +grad4D(heapU8[ABB + 1] | 0, x, +(y - 1.0), +(z - 1.0), +(w - 1.0)),
              +grad4D(heapU8[BBB + 1] | 0, +(x - 1.0), +(y - 1.0), +(z - 1.0), +(w - 1.0)),
              a,
            ),
            b,
          ),
          c,
        ),
        d,
      )
    );
  }

  return { setSeed: setSeed, perlin2D: perlin2D, perlin3D: perlin3D, perlin4D: perlin4D };
}

const { setSeed, perlin2D, perlin3D, perlin4D } = Perlin({ Math, Uint8Array }, { setSeed: random.setSeed, nextUint8: random.nextUint8 }, heap);
setSeed(Date.now());
export default {
  setSeed,
  perlin2D,
  perlin3D,
  perlin4D
}