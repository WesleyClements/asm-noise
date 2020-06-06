const hash = JSON.parse(
  '[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]',
);
hash.push(...hash);
const heap = new ArrayBuffer(0x10000);
const hashHeap = new Int8Array(heap, 0, hash.length);
hashHeap.set(hash);

function Noise(stdlib, _, heap) {
  'use asm';
  var floor = stdlib.Math.floor;
  var hash = new stdlib.Int8Array(heap);
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

    A = (hash[xi] + yi) | 0;
    B = (hash[xi + 1] + yi) | 0;

    return +lerp(
      +lerp(+grad2D(hash[A] | 0, x, y), +grad2D(hash[B] | 0, +(x - 1.0), y), a),
      +lerp(+grad2D(hash[A + 1] | 0, x, +(y - 1.0)), +grad2D(hash[B + 1] | 0, +(x - 1.0), +(y - 1.0)), a),
      b,
    );
  }

  function grad3D(hash, x, y, z) {
    hash = hash | 0;
    x = +x;
    y = +y;
    z = +z;
    var result = 0.0;
    hash = hash & 0xf;
    switch (hash | 0) {
      case 0x0:
        result = +(x + y);
        break;
      case 0x1:
        result = +(-x + y);
        break;
      case 0x2:
        result = +(x - y);
        break;
      case 0x3:
        result = +(-x - y);
        break;
      case 0x4:
        result = +(x + z);
        break;
      case 0x5:
        result = +(-x + z);
        break;
      case 0x6:
        result = +(x - z);
        break;
      case 0x7:
        result = +(-x - z);
        break;
      case 0x8:
        result = +(y + z);
        break;
      case 0x9:
        result = +(-y + z);
        break;
      case 0xa:
        result = +(y - z);
        break;
      case 0xb:
        result = +(-y - z);
        break;
      case 0xc:
        result = +(y + x);
        break;
      case 0xd:
        result = +(-y + z);
        break;
      case 0xe:
        result = +(y - x);
        break;
      case 0xf:
        result = +(-y - z);
        break;
    }
    return +result;
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

    A = (hash[xi] + yi) | 0;
    B = (hash[xi + 1] + yi) | 0;
    AA = (hash[A] + zi) | 0;
    BA = (hash[B] + zi) | 0;
    AB = (hash[A + 1] + zi) | 0;
    BB = (hash[B + 1] + zi) | 0;

    x1 = +lerp(+grad3D(hash[AA] | 0, x, y, z), +grad3D(hash[BA] | 0, +(x - 1.0), y, z), a);
    x2 = +lerp(+grad3D(hash[AB] | 0, x, +(y - 1.0), z), +grad3D(hash[BB] | 0, +(x - 1.0), +(y - 1.0), z), a);
    y1 = +lerp(x1, x2, b);

    x1 = +lerp(+grad3D(hash[AA + 1] | 0, x, y, +(z - 1.0)), +grad3D(hash[BA + 1] | 0, +(x - 1.0), y, +(z - 1.0)), a);
    x2 = +lerp(
      +grad3D(hash[AB + 1] | 0, x, +(y - 1.0), +(z - 1.0)),
      +grad3D(hash[BB + 1] | 0, +(x - 1.0), +(y - 1.0), +(z - 1.0)),
      a,
    );
    y2 = +lerp(x1, x2, b);

    return +((+lerp(y1, y2, c) + 1.0) / 2.0);
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

    A = (hash[xi] + yi) | 0;
    B = (hash[xi + 1] + yi) | 0;
    AA = (hash[A] + zi) | 0;
    BA = (hash[B] + zi) | 0;
    AB = (hash[A + 1] + zi) | 0;
    BB = (hash[B + 1] + zi) | 0;
    AAA = (hash[AA] + wi) | 0;
    BAA = (hash[BA] + wi) | 0;
    ABA = (hash[AB] + wi) | 0;
    BBA = (hash[BB] + wi) | 0;
    AAB = (hash[AA + 1] + wi) | 0;
    BAB = (hash[BA + 1] + wi) | 0;
    ABB = (hash[AB + 1] + wi) | 0;
    BBB = (hash[BB + 1] + wi) | 0;
    return (
      +(
        +lerp(
          +lerp(
            +lerp(
              +lerp(+grad4D(hash[AAA] | 0, x, y, z, w), +grad4D(hash[BAA] | 0, +(x - 1.0), y, z, w), a),
              +lerp(
                +grad4D(hash[ABA] | 0, x, +(y - 1.0), z, w),
                +grad4D(hash[BBA] | 0, +(x - 1.0), +(y - 1.0), z, w),
                a,
              ),
              b,
            ),

            +lerp(
              +lerp(
                +grad4D(hash[AAB] | 0, x, y, +(z - 1.0), w),
                +grad4D(hash[BAB] | 0, +(x - 1.0), y, +(z - 1.0), w),
                a,
              ),
              +lerp(
                +grad4D(hash[ABB] | 0, x, +(y - 1.0), +(z - 1.0), w),
                +grad4D(hash[BBB] | 0, +(x - 1.0), +(y - 1.0), +(z - 1.0), w),
                a,
              ),
              b,
            ),
            c,
          ),

          +lerp(
            +lerp(
              +lerp(
                +grad4D(hash[AAA + 1] | 0, x, y, z, +(w - 1.0)),
                +grad4D(hash[BAA + 1] | 0, +(x - 1.0), y, z, +(w - 1.0)),
                a,
              ),
              +lerp(
                +grad4D(hash[ABA + 1] | 0, x, +(y - 1.0), z, +(w - 1.0)),
                +grad4D(hash[BBA + 1] | 0, +(x - 1.0), +(y - 1.0), z, +(w - 1.0)),
                a,
              ),
              b,
            ),

            +lerp(
              +lerp(
                +grad4D(hash[AAB + 1] | 0, x, y, +(z - 1.0), +(w - 1.0)),
                +grad4D(hash[BAB + 1] | 0, +(x - 1.0), y, +(z - 1.0), +(w - 1.0)),
                a,
              ),
              +lerp(
                +grad4D(hash[ABB + 1] | 0, x, +(y - 1.0), +(z - 1.0), +(w - 1.0)),
                +grad4D(hash[BBB + 1] | 0, +(x - 1.0), +(y - 1.0), +(z - 1.0), +(w - 1.0)),
                a,
              ),
              b,
            ),
            c,
          ),
          d,
        ) + 1.0
      ) / 2.0
    );
  }
  return { perlin2D: perlin2D, perlin3D: perlin3D, perlin4D: perlin4D };
}

const lib = Noise({ Math: Math, Int8Array: Int8Array }, null, heap);

const start = Date.now();

for (let i = 0; i < 32; ++i) {
  for (let j = 0; j < 256; ++j) {
    for (let k = 0; k < 32; ++k) {
      lib.perlin2D(i / 32, j / 32, k / 32, 2.3);
    }
  }
}
console.log((Date.now() - start) / 1000);
