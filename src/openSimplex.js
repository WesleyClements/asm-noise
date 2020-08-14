import random from './random.js';

function OpenSimplex(stdlib, foreign, heap) {
  'use asm';
  var floor = stdlib.Math.floor;

  var _setSeed = foreign.setSeed;
  var nextUint32 = foreign.nextUint32;

  var heapUint16 = new stdlib.Uint16Array(heap);
  var heapF64 = new stdlib.Float64Array(heap);

  var pSize = 0x800;
  var pMask = 0x7ff;

  var X = 0x00;
  var Y = 0x08;
  var Z = 0x10;
  var W = 0x18;

  var stretchConstant2D = 0x00;
  var stretchConstant3D = 0x08;
  var stretchConstant4D = 0x10;

  var squishConstant2D = 0x18;
  var squishConstant3D = 0x20;
  var squishConstant4D = 0x28;

  var gradients2D = 0x00030; // 2048 gradients * 2 dimensions * 8 bytes
  var gradients3D = 0x08030; // 2048 gradients * 3 dimensions * 8 bytes
  var gradients4D = 0x14030; // 2048 gradients * 4 dimensions * 8 bytes

  var perm = 0x24030; // 2048 permutations * 2 byte

  function setSeed(value) {
    value = +value;
    var i = 0;
    var r = 0;
    var temp = 0;

    _setSeed(value);

    for (i = 0; (i | 0) < (pSize | 0); i = (i + 1) | 0) {
      heapUint16[(perm + (i << 1)) >> 1] = i;
    }
    for (i = 0; (i | 0) < (pSize | 0); i = (i + 1) | 0) {
      r = (nextUint32() | 0) & pMask;
      temp = getPerm(i) | 0;
      heapUint16[(perm + (i << 1)) >> 1] = getPerm(r) | 0;
      heapUint16[(perm + (r << 1)) >> 1] = temp;
    }
  }

  function getPerm(i) {
    i = i | 0;
    return heapUint16[(perm + (i << 1)) >> 1] | 0;
  }

  function extrapolate2D(xsb, ysb, dx, dy) {
    xsb = xsb | 0;
    ysb = ysb | 0;
    dx = +dx;
    dy = +dy;
    var i = 0;
    i = (getPerm(xsb & pMask) | 0) ^ (ysb & pMask);
    i = getPerm(i) | 0;
    return +heapF64[(gradients2D + (i << 4) + X) >> 3] * dx + +heapF64[(gradients2D + (i << 4) + Y) >> 3] * dy;
  }

  function openSimplex2D(x, y) {
    x = +x;
    y = +y;
    var stretchOffset = 0.0;
    var xs = 0.0;
    var ys = 0.0;
    var xsb = 0;
    var ysb = 0;
    var xins = 0.0;
    var yins = 0.0;
    var zins = 0.0;
    var inSum = 0.0;
    var squishOffsetIns = 0.0;
    var dx0 = 0.0;
    var dy0 = 0.0;
    var dx1 = 0.0;
    var dy1 = 0.0;
    var dx2 = 0.0;
    var dy2 = 0.0;
    var attn0 = 0.0;
    var attn1 = 0.0;
    var attn2 = 0.0;
    var attn_ext = 0.0;
    var dx_ext = 0.0;
    var dy_ext = 0.0;
    var xsv_ext = 0;
    var ysv_ext = 0;
    var value = 0.0;

    // Place input coordinates onto grid.
    stretchOffset = (x + y) * heapF64[stretchConstant2D >> 3];
    xs = x + stretchOffset;
    ys = y + stretchOffset;

    // Floor to get grid coordinates of rhombus (stretched square) super-cell origin.
    xsb = ~~floor(xs);
    ysb = ~~floor(ys);

    // Compute grid coordinates relative to rhombus origin.
    xins = xs - +(xsb | 0);
    yins = ys - +(ysb | 0);

    // Sum those together to get a value that determines which region we're in.
    inSum = xins + yins;

    // Positions relative to origin point.
    squishOffsetIns = inSum * heapF64[squishConstant2D >> 3];
    dx0 = xins + squishOffsetIns;
    dy0 = yins + squishOffsetIns;

    // Contribution (1,0)
    dx1 = dx0 - 1.0 - +heapF64[squishConstant2D >> 3];
    dy1 = dy0 - 0.0 - +heapF64[squishConstant2D >> 3];
    attn1 = 2.0 - dx1 * dx1 - dy1 * dy1;
    if (attn1 > 0.0) {
      attn1 = attn1 * attn1;
      value = value + attn1 * attn1 * +extrapolate2D((xsb + 1) | 0, (ysb + 0) | 0, dx1, dy1);
    }

    // Contribution (0,1)
    dx2 = dx0 - 0.0 - +heapF64[squishConstant2D >> 3];
    dy2 = dy0 - 1.0 - +heapF64[squishConstant2D >> 3];
    attn2 = 2.0 - dx2 * dx2 - dy2 * dy2;
    if (attn2 > 0.0) {
      attn2 = attn2 * attn2;
      value = value + attn2 * attn2 * +extrapolate2D((xsb + 0) | 0, (ysb + 1) | 0, dx2, dy2);
    }

    if (inSum <= 1.0) {
      // We're inside the triangle (2-Simplex) at (0,0)
      zins = 1.0 - inSum;
      if ((zins > xins) | (zins > yins)) {
        // (0,0) is one of the closest two triangular vertices
        if (xins > yins) {
          xsv_ext = (xsb + 1) | 0;
          ysv_ext = (ysb - 1) | 0;
          dx_ext = dx0 - 1.0;
          dy_ext = dy0 + 1.0;
        } else {
          xsv_ext = (xsb - 1) | 0;
          ysv_ext = (ysb + 1) | 0;
          dx_ext = dx0 + 1.0;
          dy_ext = dy0 - 1.0;
        }
      } else {
        // (1,0) and (0,1) are the closest two vertices.
        xsv_ext = (xsb + 1) | 0;
        ysv_ext = (ysb + 1) | 0;
        dx_ext = dx0 - 1.0 - 2.0 * +heapF64[squishConstant2D >> 3];
        dy_ext = dy0 - 1.0 - 2.0 * +heapF64[squishConstant2D >> 3];
      }
    } else {
      // We're inside the triangle (2-Simplex) at (1,1)
      zins = 2.0 - inSum;
      if ((zins < xins) | (zins < yins)) {
        // (0,0) is one of the closest two triangular vertices
        if (xins > yins) {
          xsv_ext = (xsb + 2) | 0;
          ysv_ext = (ysb + 0) | 0;
          dx_ext = dx0 - 2.0 - 2.0 * +heapF64[squishConstant2D >> 3];
          dy_ext = dy0 + 0.0 - 2.0 * +heapF64[squishConstant2D >> 3];
        } else {
          xsv_ext = (xsb + 0) | 0;
          ysv_ext = (ysb + 2) | 0;
          dx_ext = dx0 + 0.0 - 2.0 * +heapF64[squishConstant2D >> 3];
          dy_ext = dy0 - 2.0 - 2.0 * +heapF64[squishConstant2D >> 3];
        }
      } else {
        // (1,0) and (0,1) are the closest two vertices.
        dx_ext = dx0;
        dy_ext = dy0;
        xsv_ext = xsb;
        ysv_ext = ysb;
      }
      xsb = (xsb + 1) | 0;
      ysb = (ysb + 1) | 0;
      dx0 = dx0 - 1.0 - 2.0 * +heapF64[squishConstant2D >> 3];
      dy0 = dy0 - 1.0 - 2.0 * +heapF64[squishConstant2D >> 3];
    }

    // Contribution (0,0) or (1,1)
    attn0 = 2.0 - dx0 * dx0 - dy0 * dy0;
    if (attn0 > 0.0) {
      attn0 = attn0 * attn0;
      value = value + attn0 * attn0 * +extrapolate2D(xsb, ysb, dx0, dy0);
    }

    // Extra Vertex
    attn_ext = 2.0 - dx_ext * dx_ext - dy_ext * dy_ext;
    if (attn_ext > 0.0) {
      attn_ext = attn_ext * attn_ext;
      value = value + attn_ext * attn_ext * +extrapolate2D(xsv_ext, ysv_ext, dx_ext, dy_ext);
    }
    return value;
  }
  
  return {
    setSeed: setSeed,
    openSimplex2D: openSimplex2D,
  };
}

const heap = new ArrayBuffer(0x100000);
const heapF64 = new Float64Array(heap);

heapF64[0 + 0] = (1 / Math.sqrt(2 + 1) - 1) / 2; // stretch constant 2d
heapF64[3 + 0] = (Math.sqrt(2 + 1) - 1) / 2; // squish constant 2d
heapF64[0 + 1] = (1 / Math.sqrt(3 + 1) - 1) / 3; // stretch constant 3d
heapF64[3 + 1] = (Math.sqrt(3 + 1) - 1) / 3; // squish constant 3d
heapF64[0 + 2] = (1 / Math.sqrt(4 + 1) - 1) / 4; // stretch constant 4d
heapF64[3 + 2] = (Math.sqrt(4 + 1) - 1) / 4; // squish constant 4d

// prettier-ignore
const gradients2D = [
  0.130526192220052, 0.99144486137381,
  0.38268343236509, 0.923879532511287,
  0.608761429008721, 0.793353340291235,
  0.793353340291235, 0.608761429008721,
  0.923879532511287, 0.38268343236509,
  0.99144486137381, 0.130526192220051,
  0.99144486137381, -0.130526192220051,
  0.923879532511287, -0.38268343236509,
  0.793353340291235, -0.60876142900872,
  0.608761429008721, -0.793353340291235,
  0.38268343236509, -0.923879532511287,
  0.130526192220052, -0.99144486137381,
  -0.130526192220052, -0.99144486137381,
  -0.38268343236509, -0.923879532511287,
  -0.608761429008721, -0.793353340291235,
  -0.793353340291235, -0.608761429008721,
  -0.923879532511287, -0.38268343236509,
  -0.99144486137381, -0.130526192220052,
  -0.99144486137381, 0.130526192220051,
  -0.923879532511287, 0.38268343236509,
  -0.793353340291235, 0.608761429008721,
  -0.608761429008721, 0.793353340291235,
  -0.38268343236509, 0.923879532511287,
  -0.130526192220052, 0.99144486137381,
].map((n) => n / 7.69084574549313);

for (let i = 0; i < 0x1000; i++) {
  heapF64[6 + i] = gradients2D[i % gradients2D.length];
}

const { setSeed, openSimplex2D } = OpenSimplex(
  {
    Math,
    Uint16Array,
    Float64Array,
  },
  {
    setSeed: (value) => (random.seed = value),
    nextUint32: random.nextUint32,
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
  openSimplex2D,
};
