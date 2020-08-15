import random from './random.js';

function OpenSimplex(stdlib, foreign, heap) {
  'use asm';
  var imul = stdlib.Math.imul;
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

  function openSimplexUnoptimized2D(x, y) {
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

  function extrapolate3D(xsb, ysb, zsb, dx, dy, dz) {
    xsb = xsb | 0;
    ysb = ysb | 0;
    zsb = zsb | 0;
    dx = +dx;
    dy = +dy;
    dz = +dz;
    var i = 0;
    i = (getPerm(xsb & pMask) | 0) ^ (ysb & pMask);
    i = (getPerm(i) | 0) ^ (zsb & pMask);
    i = getPerm(i) | 0;
    i = imul(i, 3);
    return (
      +heapF64[(gradients3D + (i << 3) + X) >> 3] * dx +
      +heapF64[(gradients3D + (i << 3) + Y) >> 3] * dy +
      +heapF64[(gradients3D + (i << 3) + Z) >> 3] * dz
    );
  }

  function openSimplexUnoptimized3D(x, y, z) {
    x = +x;
    y = +y;
    z = +z;
    var stretchOffset = 0.0;
    var xs = 0.0;
    var ys = 0.0;
    var zs = 0.0;

    // Place input coordinates on simplectic honeycomb.
    stretchOffset = (x + y + z) * +heapF64[stretchConstant3D >> 3];
    xs = x + stretchOffset;
    ys = y + stretchOffset;
    zs = z + stretchOffset;

    return +eval3DBase(xs, ys, zs);
  }

  // Not as good as in SuperSimplex/OpenSimplex2S, since there are more visible differences between different slices.
  // The Z coordinate should always be the "different" coordinate in your use case.
  function eval3_XYBeforeZ(x, y, z) {
    x = +x;
    y = +y;
    z = +z;
    var xy = 0.0;
    var s2 = 0.0;
    var zz = 0.0;
    var xs = 0.0;
    var ys = 0.0;
    var zs = 0.0;
    // Combine rotation with skew transform.
    xy = x + y;
    s2 = xy * 0.211324865405187;
    zz = z * 0.288675134594813;
    xs = s2 - x + zz;
    ys = s2 - y + zz;
    zs = xy * 0.577350269189626 + zz;

    return +eval3DBase(xs, ys, zs);
  }

  // Similar to the above, except the Y coordinate should always be the "different" coordinate in your use case.
  function eval3_XZBeforeY(x, y, z) {
    x = +x;
    y = +y;
    z = +z;
    var xz = 0.0;
    var s2 = 0.0;
    var yy = 0.0;
    var xs = 0.0;
    var ys = 0.0;
    var zs = 0.0;
    // Combine rotation with skew transform.
    xz = x + z;
    s2 = xz * 0.211324865405187;
    yy = y * 0.288675134594813;
    xs = s2 - x + yy;
    zs = s2 - z + yy;
    ys = xz * 0.577350269189626 + yy;

    return +eval3DBase(xs, ys, zs);
  }

  // 3D OpenSimplex Noise (base which takes skewed coordinates directly).
  function eval3DBase(xs, ys, zs) {
    xs = +xs;
    ys = +ys;
    zs = +zs;
    var value = 0.0;
    var xsb = 0;
    var ysb = 0;
    var zsb = 0;
    var xins = 0.0;
    var yins = 0.0;
    var zins = 0.0;
    var wins = 0.0;
    var inSum = 0.0;
    var squishOffsetIns = 0.0;
    var dx0 = 0.0;
    var dy0 = 0.0;
    var dz0 = 0.0;
    var dx1 = 0.0;
    var dy1 = 0.0;
    var dz1 = 0.0;
    var dx2 = 0.0;
    var dy2 = 0.0;
    var dz2 = 0.0;
    var dx3 = 0.0;
    var dy3 = 0.0;
    var dz3 = 0.0;
    var dx4 = 0.0;
    var dy4 = 0.0;
    var dz4 = 0.0;
    var dx5 = 0.0;
    var dy5 = 0.0;
    var dz5 = 0.0;
    var dx6 = 0.0;
    var dy6 = 0.0;
    var dz6 = 0.0;

    var attn0 = 0.0;
    var attn1 = 0.0;
    var attn2 = 0.0;
    var attn3 = 0.0;
    var attn4 = 0.0;
    var attn5 = 0.0;
    var attn6 = 0.0;

    var dx_ext0 = 0.0;
    var dy_ext0 = 0.0;
    var dz_ext0 = 0.0;
    var dx_ext1 = 0.0;
    var dy_ext1 = 0.0;
    var dz_ext1 = 0.0;
    var xsv_ext0 = 0;
    var ysv_ext0 = 0;
    var zsv_ext0 = 0;
    var xsv_ext1 = 0;
    var ysv_ext1 = 0;
    var zsv_ext1 = 0;

    var attn_ext0 = 0.0;
    var attn_ext1 = 0.0;

    var aPoint = 0;
    var aScore = 0.0;
    var bPoint = 0;
    var bScore = 0.0;

    var c = 0;
    var c1 = 0;
    var c2 = 0;

    var aIsFurtherSide = 0;
    var bIsFurtherSide = 0;

    var p1 = 0.0;
    var p2 = 0.0;
    var p3 = 0.0;

    var score = 0.0;

    // Floor to get simplectic honeycomb coordinates of rhombohedron (stretched cube) super-cell origin.
    xsb = ~~floor(xs);
    ysb = ~~floor(ys);
    zsb = ~~floor(zs);

    // Compute simplectic honeycomb coordinates relative to rhombohedral origin.
    xins = xs - +(xsb | 0);
    yins = ys - +(ysb | 0);
    zins = zs - +(zsb | 0);

    // Sum those together to get a value that determines which region we're in.
    inSum = xins + yins + zins;

    // Positions relative to origin point.
    squishOffsetIns = inSum * heapF64[squishConstant3D >> 3];
    dx0 = xins + squishOffsetIns;
    dy0 = yins + squishOffsetIns;
    dz0 = zins + squishOffsetIns;

    if (inSum <= 1.0) {
      // We're inside the tetrahedron (3-Simplex) at (0,0,0)

      // Determine which two of (0,0,1, (0,1,0, (1,0,0) are closest.
      aPoint = 0x01;
      aScore = xins;
      bPoint = 0x02;
      bScore = yins;
      if ((aScore >= bScore) & (zins > bScore)) {
        bScore = zins;
        bPoint = 0x04;
      } else if ((aScore < bScore) & (zins > aScore)) {
        aScore = zins;
        aPoint = 0x04;
      }

      // Now we determine the two lattice points not part of the tetrahedron that may contribute.
      // This depends on the closest two tetrahedral vertices, including (0,0,0)
      wins = 1.0 - inSum;
      if ((wins > aScore) | (wins > bScore)) {
        // (0,0,0) is one of the closest two tetrahedral vertices.
        c = bScore > aScore ? bPoint : aPoint; // Our other closest vertex is the closest out of a and b.

        if ((c & 0x01) == 0) {
          xsv_ext0 = (xsb - 1) | 0;
          xsv_ext1 = xsb;
          dx_ext0 = dx0 + 1.0;
          dx_ext1 = dx0;
        } else {
          xsv_ext0 = xsv_ext1 = (xsb + 1) | 0;
          dx_ext0 = dx_ext1 = dx0 - 1.0;
        }

        if ((c & 0x02) == 0) {
          ysv_ext0 = ysv_ext1 = ysb;
          dy_ext0 = dy_ext1 = dy0;
          if ((c & 0x01) == 0) {
            ysv_ext1 = (ysv_ext1 - 1) | 0;
            dy_ext1 = dy_ext1 + 1.0;
          } else {
            ysv_ext0 = (ysv_ext0 - 1) | 0;
            dy_ext0 = dy_ext0 + 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
          dy_ext0 = dy_ext1 = dy0 - 1.0;
        }

        if ((c & 0x04) == 0) {
          zsv_ext0 = zsb;
          zsv_ext1 = (zsb - 1) | 0;
          dz_ext0 = dz0;
          dz_ext1 = dz0 + 1.0;
        } else {
          zsv_ext0 = zsv_ext1 = (zsb + 1) | 0;
          dz_ext0 = dz_ext1 = dz0 - 1.0;
        }
      } else {
        // (0,0,0) is not one of the closest two tetrahedral vertices.
        c = (aPoint | bPoint) & 0xff; // Our two extra vertices are determined by the closest two.

        if ((c & 0x01) == 0) {
          xsv_ext0 = xsb;
          xsv_ext1 = (xsb - 1) | 0;
          dx_ext0 = dx0 - 2.0 * heapF64[squishConstant3D >> 3];
          dx_ext1 = dx0 + 1.0 - +heapF64[squishConstant3D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = (xsb + 1) | 0;
          dx_ext0 = dx0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
          dx_ext1 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
        }

        if ((c & 0x02) == 0) {
          ysv_ext0 = ysb;
          ysv_ext1 = (ysb - 1) | 0;
          dy_ext0 = dy0 - 2.0 * heapF64[squishConstant3D >> 3];
          dy_ext1 = dy0 + 1.0 - +heapF64[squishConstant3D >> 3];
        } else {
          ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
          dy_ext0 = dy0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
          dy_ext1 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
        }

        if ((c & 0x04) == 0) {
          zsv_ext0 = zsb;
          zsv_ext1 = (zsb - 1) | 0;
          dz_ext0 = dz0 - 2.0 * heapF64[squishConstant3D >> 3];
          dz_ext1 = dz0 + 1.0 - +heapF64[squishConstant3D >> 3];
        } else {
          zsv_ext0 = zsv_ext1 = (zsb + 1) | 0;
          dz_ext0 = dz0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
          dz_ext1 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
        }
      }

      // Contribution (0,0,0)
      attn0 = 2.0 - dx0 * dx0 - dy0 * dy0 - dz0 * dz0;
      if (attn0 > 0.0) {
        attn0 = attn0 * attn0;
        value = value + attn0 * attn0 * +extrapolate3D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 0) | 0, dx0, dy0, dz0);
      }

      // Contribution (1,0,0)
      dx1 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
      dy1 = dy0 - 0.0 - +heapF64[squishConstant3D >> 3];
      dz1 = dz0 - 0.0 - +heapF64[squishConstant3D >> 3];
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value = value + attn1 * attn1 * +extrapolate3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, dx1, dy1, dz1);
      }

      // Contribution (0,1,0)
      dx2 = dx0 - 0.0 - +heapF64[squishConstant3D >> 3];
      dy2 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
      dz2 = dz1;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value = value + attn2 * attn2 * +extrapolate3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx2, dy2, dz2);
      }

      // Contribution (0,0,1)
      dx3 = dx2;
      dy3 = dy1;
      dz3 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value = value + attn3 * attn3 * +extrapolate3D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx3, dy3, dz3);
      }
    } else if (inSum >= 2.0) {
      // We're inside the tetrahedron (3-Simplex) at (1,1,1)

      // Determine which two tetrahedral vertices are the closest, out of (1,1,0, (1,0,1, (0,1,1) but not (1,1,1).
      aPoint = 0x06;
      aScore = xins;
      bPoint = 0x05;
      bScore = yins;
      if ((aScore <= bScore) & (zins < bScore)) {
        bScore = zins;
        bPoint = 0x03;
      } else if ((aScore > bScore) & (zins < aScore)) {
        aScore = zins;
        aPoint = 0x03;
      }

      // Now we determine the two lattice points not part of the tetrahedron that may contribute.
      // This depends on the closest two tetrahedral vertices, including (1,1,1)
      wins = 3.0 - inSum;
      if ((wins < aScore) | (wins < bScore)) {
        // (1,1,1) is one of the closest two tetrahedral vertices.
        c = bScore < aScore ? bPoint : aPoint; // Our other closest vertex is the closest out of a and b.

        if ((c & 0x01) != 0) {
          xsv_ext0 = (xsb + 2) | 0;
          xsv_ext1 = (xsb + 1) | 0;
          dx_ext0 = dx0 - 2.0 - 3.0 * heapF64[squishConstant3D >> 3];
          dx_ext1 = dx0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = xsb;
          dx_ext0 = dx_ext1 = dx0 - 3.0 * heapF64[squishConstant3D >> 3];
        }

        if ((c & 0x02) != 0) {
          ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
          dy_ext0 = dy_ext1 = dy0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
          if ((c & 0x01) != 0) {
            ysv_ext1 = (ysv_ext1 + 1) | 0;
            dy_ext1 = dy_ext1 - 1.0;
          } else {
            ysv_ext0 = (ysv_ext0 + 1) | 0;
            dy_ext0 = dy_ext0 - 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = ysb;
          dy_ext0 = dy_ext1 = dy0 - 3.0 * heapF64[squishConstant3D >> 3];
        }

        if ((c & 0x04) != 0) {
          zsv_ext0 = (zsb + 1) | 0;
          zsv_ext1 = (zsb + 2) | 0;
          dz_ext0 = dz0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
          dz_ext1 = dz0 - 2.0 - 3.0 * heapF64[squishConstant3D >> 3];
        } else {
          zsv_ext0 = zsv_ext1 = zsb;
          dz_ext0 = dz_ext1 = dz0 - 3.0 * heapF64[squishConstant3D >> 3];
        }
      } else {
        // (1,1,1) is not one of the closest two tetrahedral vertices.
        c = aPoint & bPoint & 0xff; // Our two extra vertices are determined by the closest two.

        if ((c & 0x01) != 0) {
          xsv_ext0 = (xsb + 1) | 0;
          xsv_ext1 = (xsb + 2) | 0;
          dx_ext0 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
          dx_ext1 = dx0 - 2.0 - 2.0 * heapF64[squishConstant3D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = xsb;
          dx_ext0 = dx0 - +heapF64[squishConstant3D >> 3];
          dx_ext1 = dx0 - 2.0 * heapF64[squishConstant3D >> 3];
        }

        if ((c & 0x02) != 0) {
          ysv_ext0 = (ysb + 1) | 0;
          ysv_ext1 = (ysb + 2) | 0;
          dy_ext0 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
          dy_ext1 = dy0 - 2.0 - 2.0 * heapF64[squishConstant3D >> 3];
        } else {
          ysv_ext0 = ysv_ext1 = ysb;
          dy_ext0 = dy0 - +heapF64[squishConstant3D >> 3];
          dy_ext1 = dy0 - 2.0 * heapF64[squishConstant3D >> 3];
        }

        if ((c & 0x04) != 0) {
          zsv_ext0 = (zsb + 1) | 0;
          zsv_ext1 = (zsb + 2) | 0;
          dz_ext0 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
          dz_ext1 = dz0 - 2.0 - 2.0 * heapF64[squishConstant3D >> 3];
        } else {
          zsv_ext0 = zsv_ext1 = zsb;
          dz_ext0 = dz0 - +heapF64[squishConstant3D >> 3];
          dz_ext1 = dz0 - 2.0 * heapF64[squishConstant3D >> 3];
        }
      }

      // Contribution (1,1,0)
      dx3 = dx0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dy3 = dy0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dz3 = dz0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value = value + attn3 * attn3 * +extrapolate3D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx3, dy3, dz3);
      }

      // Contribution (1,0,1)
      dx2 = dx3;
      dy2 = dy0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dz2 = dz0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value = value + attn2 * attn2 * +extrapolate3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx2, dy2, dz2);
      }

      // Contribution (0,1,1)
      dx1 = dx0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dy1 = dy3;
      dz1 = dz2;
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value = value + attn1 * attn1 * +extrapolate3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, dx1, dy1, dz1);
      }

      // Contribution (1,1,1)
      dx0 = dx0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
      dy0 = dy0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
      dz0 = dz0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
      attn0 = 2.0 - dx0 * dx0 - dy0 * dy0 - dz0 * dz0;
      if (attn0 > 0.0) {
        attn0 = attn0 * attn0;
        value = value + attn0 * attn0 * +extrapolate3D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 1) | 0, dx0, dy0, dz0);
      }
    } else {
      // We're inside the octahedron (Rectified 3-Simplex) in between.

      // Decide between point (0,0,1) and (1,1,0) as closest
      p1 = xins + yins;
      if (p1 > 1.0) {
        aScore = p1 - 1.0;
        aPoint = 0x03;
        aIsFurtherSide = 1;
      } else {
        aScore = 1.0 - p1;
        aPoint = 0x04;
        aIsFurtherSide = 0;
      }

      // Decide between point (0,1,0) and (1,0,1) as closest
      p2 = xins + zins;
      if (p2 > 1.0) {
        bScore = p2 - 1.0;
        bPoint = 0x05;
        bIsFurtherSide = 1;
      } else {
        bScore = 1.0 - p2;
        bPoint = 0x02;
        bIsFurtherSide = 0;
      }

      // The closest out of the two (1,0,0) and (0,1,1) will replace the furthest out of the two decided above, if closer.
      p3 = yins + zins;
      if (p3 > 1.0) {
        score = p3 - 1.0;
        if ((aScore <= bScore) & (aScore < score)) {
          aScore = score;
          aPoint = 0x06;
          aIsFurtherSide = 1;
        } else if ((aScore > bScore) & (bScore < score)) {
          bScore = score;
          bPoint = 0x06;
          bIsFurtherSide = 1;
        }
      } else {
        score = 1.0 - p3;
        if ((aScore <= bScore) & (aScore < score)) {
          aScore = score;
          aPoint = 0x01;
          aIsFurtherSide = 0;
        } else if ((aScore > bScore) & (bScore < score)) {
          bScore = score;
          bPoint = 0x01;
          bIsFurtherSide = 0;
        }
      }

      // Where each of the two closest points are determines how the extra two vertices are calculated.
      if ((aIsFurtherSide | 0) == (bIsFurtherSide | 0)) {
        if (aIsFurtherSide) {
          // Both closest points on (1,1,1) side

          // One of the two extra points is (1,1,1)
          dx_ext0 = dx0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
          dy_ext0 = dy0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
          dz_ext0 = dz0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
          xsv_ext0 = (xsb + 1) | 0;
          ysv_ext0 = (ysb + 1) | 0;
          zsv_ext0 = (zsb + 1) | 0;

          // Other extra point is based on the shared axis.
          c = aPoint & bPoint & 0xff;
          if ((c & 0x01) != 0) {
            dx_ext1 = dx0 - 2.0 - 2.0 * heapF64[squishConstant3D >> 3];
            dy_ext1 = dy0 - 2.0 * heapF64[squishConstant3D >> 3];
            dz_ext1 = dz0 - 2.0 * heapF64[squishConstant3D >> 3];
            xsv_ext1 = (xsb + 2) | 0;
            ysv_ext1 = ysb;
            zsv_ext1 = zsb;
          } else if ((c & 0x02) != 0) {
            dx_ext1 = dx0 - 2.0 * heapF64[squishConstant3D >> 3];
            dy_ext1 = dy0 - 2.0 - 2.0 * heapF64[squishConstant3D >> 3];
            dz_ext1 = dz0 - 2.0 * heapF64[squishConstant3D >> 3];
            xsv_ext1 = xsb;
            ysv_ext1 = (ysb + 2) | 0;
            zsv_ext1 = zsb;
          } else {
            dx_ext1 = dx0 - 2.0 * heapF64[squishConstant3D >> 3];
            dy_ext1 = dy0 - 2.0 * heapF64[squishConstant3D >> 3];
            dz_ext1 = dz0 - 2.0 - 2.0 * heapF64[squishConstant3D >> 3];
            xsv_ext1 = xsb;
            ysv_ext1 = ysb;
            zsv_ext1 = (zsb + 2) | 0;
          }
        } else {
          // Both closest points on (0,0,0) side

          // One of the two extra points is (0,0,0)
          dx_ext0 = dx0;
          dy_ext0 = dy0;
          dz_ext0 = dz0;
          xsv_ext0 = xsb;
          ysv_ext0 = ysb;
          zsv_ext0 = zsb;

          // Other extra point is based on the omitted axis.
          c = (aPoint | bPoint) & 0xff;
          if ((c & 0x01) == 0) {
            dx_ext1 = dx0 + 1.0 - +heapF64[squishConstant3D >> 3];
            dy_ext1 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
            dz_ext1 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
            xsv_ext1 = (xsb - 1) | 0;
            ysv_ext1 = (ysb + 1) | 0;
            zsv_ext1 = (zsb + 1) | 0;
          } else if ((c & 0x02) == 0) {
            dx_ext1 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
            dy_ext1 = dy0 + 1.0 - +heapF64[squishConstant3D >> 3];
            dz_ext1 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
            xsv_ext1 = (xsb + 1) | 0;
            ysv_ext1 = (ysb - 1) | 0;
            zsv_ext1 = (zsb + 1) | 0;
          } else {
            dx_ext1 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
            dy_ext1 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
            dz_ext1 = dz0 + 1.0 - +heapF64[squishConstant3D >> 3];
            xsv_ext1 = (xsb + 1) | 0;
            ysv_ext1 = (ysb + 1) | 0;
            zsv_ext1 = (zsb - 1) | 0;
          }
        }
      } else {
        // One point on (0,0,0) side, one point on (1,1,1) side
        if (aIsFurtherSide) {
          c1 = aPoint;
          c2 = bPoint;
        } else {
          c1 = bPoint;
          c2 = aPoint;
        }

        // One contribution is a permutation of (1,1,-1)
        if ((c1 & 0x01) == 0) {
          dx_ext0 = dx0 + 1.0 - +heapF64[squishConstant3D >> 3];
          dy_ext0 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
          dz_ext0 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
          xsv_ext0 = (xsb - 1) | 0;
          ysv_ext0 = (ysb + 1) | 0;
          zsv_ext0 = (zsb + 1) | 0;
        } else if ((c1 & 0x02) == 0) {
          dx_ext0 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
          dy_ext0 = dy0 + 1.0 - +heapF64[squishConstant3D >> 3];
          dz_ext0 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
          xsv_ext0 = (xsb + 1) | 0;
          ysv_ext0 = (ysb - 1) | 0;
          zsv_ext0 = (zsb + 1) | 0;
        } else {
          dx_ext0 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
          dy_ext0 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
          dz_ext0 = dz0 + 1.0 - +heapF64[squishConstant3D >> 3];
          xsv_ext0 = (xsb + 1) | 0;
          ysv_ext0 = (ysb + 1) | 0;
          zsv_ext0 = (zsb - 1) | 0;
        }

        // One contribution is a permutation of (0,0,2)
        dx_ext1 = dx0 - 2.0 * heapF64[squishConstant3D >> 3];
        dy_ext1 = dy0 - 2.0 * heapF64[squishConstant3D >> 3];
        dz_ext1 = dz0 - 2.0 * heapF64[squishConstant3D >> 3];
        xsv_ext1 = xsb;
        ysv_ext1 = ysb;
        zsv_ext1 = zsb;
        if ((c2 & 0x01) != 0) {
          dx_ext1 = dx_ext1 - 2.0;
          xsv_ext1 = (xsv_ext1 + 2) | 0;
        } else if ((c2 & 0x02) != 0) {
          dy_ext1 = dy_ext1 - 2.0;
          ysv_ext1 = (ysv_ext1 + 2) | 0;
        } else {
          dz_ext1 = dz_ext1 - 2.0;
          zsv_ext1 = (zsv_ext1 + 2) | 0;
        }
      }

      // Contribution (1,0,0)
      dx1 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
      dy1 = dy0 - 0.0 - +heapF64[squishConstant3D >> 3];
      dz1 = dz0 - 0.0 - +heapF64[squishConstant3D >> 3];
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value = value + attn1 * attn1 * +extrapolate3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, dx1, dy1, dz1);
      }

      // Contribution (0,1,0)
      dx2 = dx0 - 0.0 - +heapF64[squishConstant3D >> 3];
      dy2 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
      dz2 = dz1;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value = value + attn2 * attn2 * +extrapolate3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx2, dy2, dz2);
      }

      // Contribution (0,0,1)
      dx3 = dx2;
      dy3 = dy1;
      dz3 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value = value + attn3 * attn3 * +extrapolate3D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx3, dy3, dz3);
      }

      // Contribution (1,1,0)
      dx4 = dx0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dy4 = dy0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dz4 = dz0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      attn4 = 2.0 - dx4 * dx4 - dy4 * dy4 - dz4 * dz4;
      if (attn4 > 0.0) {
        attn4 = attn4 * attn4;
        value = value + attn4 * attn4 * +extrapolate3D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx4, dy4, dz4);
      }

      // Contribution (1,0,1)
      dx5 = dx4;
      dy5 = dy0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dz5 = dz0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      attn5 = 2.0 - dx5 * dx5 - dy5 * dy5 - dz5 * dz5;
      if (attn5 > 0.0) {
        attn5 = attn5 * attn5;
        value = value + attn5 * attn5 * +extrapolate3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx5, dy5, dz5);
      }

      // Contribution (0,1,1)
      dx6 = dx0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dy6 = dy4;
      dz6 = dz5;
      attn6 = 2.0 - dx6 * dx6 - dy6 * dy6 - dz6 * dz6;
      if (attn6 > 0.0) {
        attn6 = attn6 * attn6;
        value = value + attn6 * attn6 * +extrapolate3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, dx6, dy6, dz6);
      }
    }

    // First extra vertex
    attn_ext0 = 2.0 - dx_ext0 * dx_ext0 - dy_ext0 * dy_ext0 - dz_ext0 * dz_ext0;
    if (attn_ext0 > 0.0) {
      attn_ext0 = attn_ext0 * attn_ext0;
      value = value + attn_ext0 * attn_ext0 * +extrapolate3D(xsv_ext0, ysv_ext0, zsv_ext0, dx_ext0, dy_ext0, dz_ext0);
    }

    // Second extra vertex
    attn_ext1 = 2.0 - dx_ext1 * dx_ext1 - dy_ext1 * dy_ext1 - dz_ext1 * dz_ext1;
    if (attn_ext1 > 0.0) {
      attn_ext1 = attn_ext1 * attn_ext1;
      value = value + attn_ext1 * attn_ext1 * +extrapolate3D(xsv_ext1, ysv_ext1, zsv_ext1, dx_ext1, dy_ext1, dz_ext1);
    }

    return value;
  }

  function extrapolate4D(xsb, ysb, zsb, wsb, dx, dy, dz, dw) {
    xsb = xsb | 0;
    ysb = ysb | 0;
    zsb = zsb | 0;
    wsb = wsb | 0;
    dx = +dx;
    dy = +dy;
    dz = +dz;
    dw = +dw;
    var i = 0;
    i = (getPerm(xsb & pMask) | 0) ^ (ysb & pMask);
    i = (getPerm(i) | 0) ^ (zsb & pMask);
    i = (getPerm(i) | 0) ^ (wsb & pMask);
    i = getPerm(i) | 0;
    return (
      +heapF64[(gradients2D + (i << 5) + X) >> 3] * dx +
      +heapF64[(gradients2D + (i << 5) + Y) >> 3] * dy +
      +heapF64[(gradients2D + (i << 5) + Z) >> 3] * dz +
      +heapF64[(gradients2D + (i << 5) + W) >> 3] * dw
    );
  }

  return {
    setSeed: setSeed,
    openSimplexUnoptimized2D: openSimplexUnoptimized2D,
    openSimplexUnoptimized3D: openSimplexUnoptimized3D,
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

// prettier-ignore
const gradients3D = [
  -1.4082482904633333,  -1.4082482904633333,  -2.6329931618533333,
  -0.07491495712999985,  -0.07491495712999985,  -3.29965982852,
  0.24732126143473554,  -1.6667938651159684,  -2.838945207362466,
  -1.6667938651159684,  0.24732126143473554,  -2.838945207362466,
  -1.4082482904633333,  -2.6329931618533333,  -1.4082482904633333,
  -0.07491495712999985,  -3.29965982852,  -0.07491495712999985,
  -1.6667938651159684,  -2.838945207362466,  0.24732126143473554,
  0.24732126143473554,  -2.838945207362466,  -1.6667938651159684,
  1.5580782047233335,  0.33333333333333337,  -2.8914115380566665,
  2.8914115380566665,  -0.33333333333333337,  -1.5580782047233335,
  1.8101897177633992,  -1.2760767510338025,  -2.4482280932803,
  2.4482280932803,  1.2760767510338025,  -1.8101897177633992,
  1.5580782047233335,  -2.8914115380566665,  0.33333333333333337,
  2.8914115380566665,  -1.5580782047233335,  -0.33333333333333337,
  2.4482280932803,  -1.8101897177633992,  1.2760767510338025,
  1.8101897177633992,  -2.4482280932803,  -1.2760767510338025,
  -2.6329931618533333,  -1.4082482904633333,  -1.4082482904633333,
  -3.29965982852,  -0.07491495712999985,  -0.07491495712999985,
  -2.838945207362466,  0.24732126143473554,  -1.6667938651159684,
  -2.838945207362466,  -1.6667938651159684,  0.24732126143473554,
  0.33333333333333337,  1.5580782047233335,  -2.8914115380566665,
  -0.33333333333333337,  2.8914115380566665,  -1.5580782047233335,
  1.2760767510338025,  2.4482280932803,  -1.8101897177633992,
  -1.2760767510338025,  1.8101897177633992,  -2.4482280932803,
  0.33333333333333337,  -2.8914115380566665,  1.5580782047233335,
  -0.33333333333333337,  -1.5580782047233335,  2.8914115380566665,
  -1.2760767510338025,  -2.4482280932803,  1.8101897177633992,
  1.2760767510338025,  -1.8101897177633992,  2.4482280932803,
  3.29965982852,  0.07491495712999985,  0.07491495712999985,
  2.6329931618533333,  1.4082482904633333,  1.4082482904633333,
  2.838945207362466,  -0.24732126143473554,  1.6667938651159684,
  2.838945207362466,  1.6667938651159684,  -0.24732126143473554,
  -2.8914115380566665,  1.5580782047233335,  0.33333333333333337,
  -1.5580782047233335,  2.8914115380566665,  -0.33333333333333337,
  -2.4482280932803,  1.8101897177633992,  -1.2760767510338025,
  -1.8101897177633992,  2.4482280932803,  1.2760767510338025,
  -2.8914115380566665,  0.33333333333333337,  1.5580782047233335,
  -1.5580782047233335,  -0.33333333333333337,  2.8914115380566665,
  -1.8101897177633992,  1.2760767510338025,  2.4482280932803,
  -2.4482280932803,  -1.2760767510338025,  1.8101897177633992,
  0.07491495712999985,  3.29965982852,  0.07491495712999985,
  1.4082482904633333,  2.6329931618533333,  1.4082482904633333,
  1.6667938651159684,  2.838945207362466,  -0.24732126143473554,
  -0.24732126143473554,  2.838945207362466,  1.6667938651159684,
  0.07491495712999985,  0.07491495712999985,  3.29965982852,
  1.4082482904633333,  1.4082482904633333,  2.6329931618533333,
  -0.24732126143473554,  1.6667938651159684,  2.838945207362466,
  1.6667938651159684,  -0.24732126143473554,  2.838945207362466
].map((n) => n / 26.92263139946168);

// prettier-ignore
const gradients4D = [
  -0.753341017856078, -0.37968289875261624, -0.37968289875261624, -0.37968289875261624,
  -0.7821684431180708, -0.4321472685365301, -0.4321472685365301, 0.12128480194602098,
  -0.7821684431180708, -0.4321472685365301, 0.12128480194602098, -0.4321472685365301,
  -0.7821684431180708, 0.12128480194602098, -0.4321472685365301, -0.4321472685365301,
  -0.8586508742123365, -0.508629699630796, 0.044802370851755174, 0.044802370851755174,
  -0.8586508742123365, 0.044802370851755174, -0.508629699630796, 0.044802370851755174,
  -0.8586508742123365, 0.044802370851755174, 0.044802370851755174, -0.508629699630796,
  -0.9982828964265062, -0.03381941603233842, -0.03381941603233842, -0.03381941603233842,
  -0.37968289875261624, -0.753341017856078, -0.37968289875261624, -0.37968289875261624,
  -0.4321472685365301, -0.7821684431180708, -0.4321472685365301, 0.12128480194602098,
  -0.4321472685365301, -0.7821684431180708, 0.12128480194602098, -0.4321472685365301,
  0.12128480194602098, -0.7821684431180708, -0.4321472685365301, -0.4321472685365301,
  -0.508629699630796, -0.8586508742123365, 0.044802370851755174, 0.044802370851755174,
  0.044802370851755174, -0.8586508742123365, -0.508629699630796, 0.044802370851755174,
  0.044802370851755174, -0.8586508742123365, 0.044802370851755174, -0.508629699630796,
  -0.03381941603233842, -0.9982828964265062, -0.03381941603233842, -0.03381941603233842,
  -0.37968289875261624, -0.37968289875261624, -0.753341017856078, -0.37968289875261624,
  -0.4321472685365301, -0.4321472685365301, -0.7821684431180708, 0.12128480194602098,
  -0.4321472685365301, 0.12128480194602098, -0.7821684431180708, -0.4321472685365301,
  0.12128480194602098, -0.4321472685365301, -0.7821684431180708, -0.4321472685365301,
  -0.508629699630796, 0.044802370851755174, -0.8586508742123365, 0.044802370851755174,
  0.044802370851755174, -0.508629699630796, -0.8586508742123365, 0.044802370851755174,
  0.044802370851755174, 0.044802370851755174, -0.8586508742123365, -0.508629699630796,
  -0.03381941603233842, -0.03381941603233842, -0.9982828964265062, -0.03381941603233842,
  -0.37968289875261624, -0.37968289875261624, -0.37968289875261624, -0.753341017856078,
  -0.4321472685365301, -0.4321472685365301, 0.12128480194602098, -0.7821684431180708,
  -0.4321472685365301, 0.12128480194602098, -0.4321472685365301, -0.7821684431180708,
  0.12128480194602098, -0.4321472685365301, -0.4321472685365301, -0.7821684431180708,
  -0.508629699630796, 0.044802370851755174, 0.044802370851755174, -0.8586508742123365,
  0.044802370851755174, -0.508629699630796, 0.044802370851755174, -0.8586508742123365,
  0.044802370851755174, 0.044802370851755174, -0.508629699630796, -0.8586508742123365,
  -0.03381941603233842, -0.03381941603233842, -0.03381941603233842, -0.9982828964265062,
  -0.6740059517812944, -0.3239847771997537, -0.3239847771997537, 0.5794684678643381,
  -0.7504883828755602, -0.4004672082940195, 0.15296486218853164, 0.5029860367700724,
  -0.7504883828755602, 0.15296486218853164, -0.4004672082940195, 0.5029860367700724,
  -0.8828161875373585, 0.08164729285680945, 0.08164729285680945, 0.4553054119602712,
  -0.4553054119602712, -0.08164729285680945, -0.08164729285680945, 0.8828161875373585,
  -0.5029860367700724, -0.15296486218853164, 0.4004672082940195, 0.7504883828755602,
  -0.5029860367700724, 0.4004672082940195, -0.15296486218853164, 0.7504883828755602,
  -0.5794684678643381, 0.3239847771997537, 0.3239847771997537, 0.6740059517812944,
  -0.3239847771997537, -0.6740059517812944, -0.3239847771997537, 0.5794684678643381,
  -0.4004672082940195, -0.7504883828755602, 0.15296486218853164, 0.5029860367700724,
  0.15296486218853164, -0.7504883828755602, -0.4004672082940195, 0.5029860367700724,
  0.08164729285680945, -0.8828161875373585, 0.08164729285680945, 0.4553054119602712,
  -0.08164729285680945, -0.4553054119602712, -0.08164729285680945, 0.8828161875373585,
  -0.15296486218853164, -0.5029860367700724, 0.4004672082940195, 0.7504883828755602,
  0.4004672082940195, -0.5029860367700724, -0.15296486218853164, 0.7504883828755602,
  0.3239847771997537, -0.5794684678643381, 0.3239847771997537, 0.6740059517812944,
  -0.3239847771997537, -0.3239847771997537, -0.6740059517812944, 0.5794684678643381,
  -0.4004672082940195, 0.15296486218853164, -0.7504883828755602, 0.5029860367700724,
  0.15296486218853164, -0.4004672082940195, -0.7504883828755602, 0.5029860367700724,
  0.08164729285680945, 0.08164729285680945, -0.8828161875373585, 0.4553054119602712,
  -0.08164729285680945, -0.08164729285680945, -0.4553054119602712, 0.8828161875373585,
  -0.15296486218853164, 0.4004672082940195, -0.5029860367700724, 0.7504883828755602,
  0.4004672082940195, -0.15296486218853164, -0.5029860367700724, 0.7504883828755602,
  0.3239847771997537, 0.3239847771997537, -0.5794684678643381, 0.6740059517812944,
  -0.6740059517812944, -0.3239847771997537, 0.5794684678643381, -0.3239847771997537,
  -0.7504883828755602, -0.4004672082940195, 0.5029860367700724, 0.15296486218853164,
  -0.7504883828755602, 0.15296486218853164, 0.5029860367700724, -0.4004672082940195,
  -0.8828161875373585, 0.08164729285680945, 0.4553054119602712, 0.08164729285680945,
  -0.4553054119602712, -0.08164729285680945, 0.8828161875373585, -0.08164729285680945,
  -0.5029860367700724, -0.15296486218853164, 0.7504883828755602, 0.4004672082940195,
  -0.5029860367700724, 0.4004672082940195, 0.7504883828755602, -0.15296486218853164,
  -0.5794684678643381, 0.3239847771997537, 0.6740059517812944, 0.3239847771997537,
  -0.3239847771997537, -0.6740059517812944, 0.5794684678643381, -0.3239847771997537,
  -0.4004672082940195, -0.7504883828755602, 0.5029860367700724, 0.15296486218853164,
  0.15296486218853164, -0.7504883828755602, 0.5029860367700724, -0.4004672082940195,
  0.08164729285680945, -0.8828161875373585, 0.4553054119602712, 0.08164729285680945,
  -0.08164729285680945, -0.4553054119602712, 0.8828161875373585, -0.08164729285680945,
  -0.15296486218853164, -0.5029860367700724, 0.7504883828755602, 0.4004672082940195,
  0.4004672082940195, -0.5029860367700724, 0.7504883828755602, -0.15296486218853164,
  0.3239847771997537, -0.5794684678643381, 0.6740059517812944, 0.3239847771997537,
  -0.3239847771997537, -0.3239847771997537, 0.5794684678643381, -0.6740059517812944,
  -0.4004672082940195, 0.15296486218853164, 0.5029860367700724, -0.7504883828755602,
  0.15296486218853164, -0.4004672082940195, 0.5029860367700724, -0.7504883828755602,
  0.08164729285680945, 0.08164729285680945, 0.4553054119602712, -0.8828161875373585,
  -0.08164729285680945, -0.08164729285680945, 0.8828161875373585, -0.4553054119602712,
  -0.15296486218853164, 0.4004672082940195, 0.7504883828755602, -0.5029860367700724,
  0.4004672082940195, -0.15296486218853164, 0.7504883828755602, -0.5029860367700724,
  0.3239847771997537, 0.3239847771997537, 0.6740059517812944, -0.5794684678643381,
  -0.6740059517812944, 0.5794684678643381, -0.3239847771997537, -0.3239847771997537,
  -0.7504883828755602, 0.5029860367700724, -0.4004672082940195, 0.15296486218853164,
  -0.7504883828755602, 0.5029860367700724, 0.15296486218853164, -0.4004672082940195,
  -0.8828161875373585, 0.4553054119602712, 0.08164729285680945, 0.08164729285680945,
  -0.4553054119602712, 0.8828161875373585, -0.08164729285680945, -0.08164729285680945,
  -0.5029860367700724, 0.7504883828755602, -0.15296486218853164, 0.4004672082940195,
  -0.5029860367700724, 0.7504883828755602, 0.4004672082940195, -0.15296486218853164,
  -0.5794684678643381, 0.6740059517812944, 0.3239847771997537, 0.3239847771997537,
  -0.3239847771997537, 0.5794684678643381, -0.6740059517812944, -0.3239847771997537,
  -0.4004672082940195, 0.5029860367700724, -0.7504883828755602, 0.15296486218853164,
  0.15296486218853164, 0.5029860367700724, -0.7504883828755602, -0.4004672082940195,
  0.08164729285680945, 0.4553054119602712, -0.8828161875373585, 0.08164729285680945,
  -0.08164729285680945, 0.8828161875373585, -0.4553054119602712, -0.08164729285680945,
  -0.15296486218853164, 0.7504883828755602, -0.5029860367700724, 0.4004672082940195,
  0.4004672082940195, 0.7504883828755602, -0.5029860367700724, -0.15296486218853164,
  0.3239847771997537, 0.6740059517812944, -0.5794684678643381, 0.3239847771997537,
  -0.3239847771997537, 0.5794684678643381, -0.3239847771997537, -0.6740059517812944,
  -0.4004672082940195, 0.5029860367700724, 0.15296486218853164, -0.7504883828755602,
  0.15296486218853164, 0.5029860367700724, -0.4004672082940195, -0.7504883828755602,
  0.08164729285680945, 0.4553054119602712, 0.08164729285680945, -0.8828161875373585,
  -0.08164729285680945, 0.8828161875373585, -0.08164729285680945, -0.4553054119602712,
  -0.15296486218853164, 0.7504883828755602, 0.4004672082940195, -0.5029860367700724,
  0.4004672082940195, 0.7504883828755602, -0.15296486218853164, -0.5029860367700724,
  0.3239847771997537, 0.6740059517812944, 0.3239847771997537, -0.5794684678643381,
  0.5794684678643381, -0.6740059517812944, -0.3239847771997537, -0.3239847771997537,
  0.5029860367700724, -0.7504883828755602, -0.4004672082940195, 0.15296486218853164,
  0.5029860367700724, -0.7504883828755602, 0.15296486218853164, -0.4004672082940195,
  0.4553054119602712, -0.8828161875373585, 0.08164729285680945, 0.08164729285680945,
  0.8828161875373585, -0.4553054119602712, -0.08164729285680945, -0.08164729285680945,
  0.7504883828755602, -0.5029860367700724, -0.15296486218853164, 0.4004672082940195,
  0.7504883828755602, -0.5029860367700724, 0.4004672082940195, -0.15296486218853164,
  0.6740059517812944, -0.5794684678643381, 0.3239847771997537, 0.3239847771997537,
  0.5794684678643381, -0.3239847771997537, -0.6740059517812944, -0.3239847771997537,
  0.5029860367700724, -0.4004672082940195, -0.7504883828755602, 0.15296486218853164,
  0.5029860367700724, 0.15296486218853164, -0.7504883828755602, -0.4004672082940195,
  0.4553054119602712, 0.08164729285680945, -0.8828161875373585, 0.08164729285680945,
  0.8828161875373585, -0.08164729285680945, -0.4553054119602712, -0.08164729285680945,
  0.7504883828755602, -0.15296486218853164, -0.5029860367700724, 0.4004672082940195,
  0.7504883828755602, 0.4004672082940195, -0.5029860367700724, -0.15296486218853164,
  0.6740059517812944, 0.3239847771997537, -0.5794684678643381, 0.3239847771997537,
  0.5794684678643381, -0.3239847771997537, -0.3239847771997537, -0.6740059517812944,
  0.5029860367700724, -0.4004672082940195, 0.15296486218853164, -0.7504883828755602,
  0.5029860367700724, 0.15296486218853164, -0.4004672082940195, -0.7504883828755602,
  0.4553054119602712, 0.08164729285680945, 0.08164729285680945, -0.8828161875373585,
  0.8828161875373585, -0.08164729285680945, -0.08164729285680945, -0.4553054119602712,
  0.7504883828755602, -0.15296486218853164, 0.4004672082940195, -0.5029860367700724,
  0.7504883828755602, 0.4004672082940195, -0.15296486218853164, -0.5029860367700724,
  0.6740059517812944, 0.3239847771997537, 0.3239847771997537, -0.5794684678643381,
  0.03381941603233842, 0.03381941603233842, 0.03381941603233842, 0.9982828964265062,
  -0.044802370851755174, -0.044802370851755174, 0.508629699630796, 0.8586508742123365,
  -0.044802370851755174, 0.508629699630796, -0.044802370851755174, 0.8586508742123365,
  -0.12128480194602098, 0.4321472685365301, 0.4321472685365301, 0.7821684431180708,
  0.508629699630796, -0.044802370851755174, -0.044802370851755174, 0.8586508742123365,
  0.4321472685365301, -0.12128480194602098, 0.4321472685365301, 0.7821684431180708,
  0.4321472685365301, 0.4321472685365301, -0.12128480194602098, 0.7821684431180708,
  0.37968289875261624, 0.37968289875261624, 0.37968289875261624, 0.753341017856078,
  0.03381941603233842, 0.03381941603233842, 0.9982828964265062, 0.03381941603233842,
  -0.044802370851755174, 0.044802370851755174, 0.8586508742123365, 0.508629699630796,
  -0.044802370851755174, 0.508629699630796, 0.8586508742123365, -0.044802370851755174,
  -0.12128480194602098, 0.4321472685365301, 0.7821684431180708, 0.4321472685365301,
  0.508629699630796, -0.044802370851755174, 0.8586508742123365, -0.044802370851755174,
  0.4321472685365301, -0.12128480194602098, 0.7821684431180708, 0.4321472685365301,
  0.4321472685365301, 0.4321472685365301, 0.7821684431180708, -0.12128480194602098,
  0.37968289875261624, 0.37968289875261624, 0.753341017856078, 0.37968289875261624,
  0.03381941603233842, 0.9982828964265062, 0.03381941603233842, 0.03381941603233842,
  -0.044802370851755174, 0.8586508742123365, -0.044802370851755174, 0.508629699630796,
  -0.044802370851755174, 0.8586508742123365, 0.508629699630796, -0.044802370851755174,
  -0.12128480194602098, 0.7821684431180708, 0.4321472685365301, 0.4321472685365301,
  0.508629699630796, 0.8586508742123365, -0.044802370851755174, -0.044802370851755174,
  0.4321472685365301, 0.7821684431180708, -0.12128480194602098, 0.4321472685365301,
  0.4321472685365301, 0.7821684431180708, 0.4321472685365301, -0.12128480194602098,
  0.37968289875261624, 0.753341017856078, 0.37968289875261624, 0.37968289875261624,
  0.9982828964265062, 0.03381941603233842, 0.03381941603233842, 0.03381941603233842,
  0.8586508742123365, -0.044802370851755174, -0.044802370851755174, 0.508629699630796,
  0.8586508742123365, -0.044802370851755174, 0.508629699630796, -0.044802370851755174,
  0.7821684431180708, -0.12128480194602098, 0.4321472685365301, 0.4321472685365301,
  0.8586508742123365, 0.508629699630796, -0.044802370851755174, -0.044802370851755174,
  0.7821684431180708, 0.4321472685365301, -0.12128480194602098, 0.4321472685365301,
  0.7821684431180708, 0.4321472685365301, 0.4321472685365301, -0.12128480194602098,
  0.753341017856078, 0.37968289875261624, 0.37968289875261624, 0.37968289875261624,
].map((n) => n / 8.881759591352166);

for (let i = 0; i < 2 * 0x800; i++) {
  heapF64[6 + i] = gradients2D[i % gradients2D.length];
}

for (let i = 0; i < 3 * 0x800; i++) {
  heapF64[6 + 2 * 0x800 + i] = gradients3D[i % gradients3D.length];
}

for (let i = 0; i < 4 * 0x800; i++) {
  heapF64[6 + (2 + 3) * 0x800 + i] = gradients4D[i % gradients4D.length];
}

const { setSeed, openSimplexUnoptimized2D, openSimplexUnoptimized3D } = OpenSimplex(
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
  openSimplexUnoptimized2D,
  openSimplexUnoptimized3D,
};
