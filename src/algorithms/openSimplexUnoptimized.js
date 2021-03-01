import random from "../util/random";

function OpenSimplexUnoptimized(stdlib, foreign, heap) {
  "use asm";

  var imul = stdlib.Math.imul;
  var floor = stdlib.Math.floor;

  var _setSeed = foreign.setSeed;
  var nextU32 = foreign.nextUint32;

  var heapU16 = new stdlib.Uint16Array(heap);
  var heapF64 = new stdlib.Float64Array(heap);

  var pSize = 0x800;
  var pMask = 0x7ff;

  var X = 0x00;
  var Y = 0x08;
  var Z = 0x10;
  var W = 0x18;

  var perm = 0x0; // 2048 permutations * 2 byte

  var stretchConstant2D = 0x1000;
  var stretchConstant3D = 0x1008;
  var stretchConstant4D = 0x1010;

  var squishConstant2D = 0x1018;
  var squishConstant3D = 0x1020;
  var squishConstant4D = 0x1028;

  var gradients2D = 0x01030; // 2048 gradients * 2 dimensions * 8 bytes
  var gradients3D = 0x09030; // 2048 gradients * 3 dimensions * 8 bytes
  var gradients4D = 0x15030; // 2048 gradients * 4 dimensions * 8 bytes

  function normalize(n) {
    n = +n;
    return (n + 1.0) / 2.0;
  }

  function setSeed(value) {
    value = +value;
    var i = 0;
    var r = 0;
    var temp = 0;

    _setSeed(value);

    for (i = 0; (i | 0) < (pSize | 0); i = (i + 1) | 0) {
      heapU16[(perm + (i << 1)) >> 1] = i;
    }
    for (i = 0; (i | 0) < (pSize | 0); i = (i + 1) | 0) {
      r = (nextU32() | 0) & pMask;
      temp = getPerm(i) | 0;
      heapU16[(perm + (i << 1)) >> 1] = getPerm(r) | 0;
      heapU16[(perm + (r << 1)) >> 1] = temp;
    }
  }

  function getPerm(i) {
    i = i | 0;
    return heapU16[(perm + (i << 1)) >> 1] | 0;
  }

  function noise2D(octaves, lacunarity, persistence, xOffset, yOffset, x, y) {
    octaves = octaves | 0;
    lacunarity = +lacunarity;
    persistence = +persistence;
    xOffset = +xOffset;
    yOffset = +yOffset;
    x = +x;
    y = +y;
    var total = 0.0;
    var frequency = 1.0;
    var amplitude = 1.0;
    var max = 0.0;
    var i = 0;
    for (i = 0; (i | 0) < (octaves | 0); i = (i + 1) | 0) {
      total = total + +eval2D(x * frequency, y * frequency) * amplitude;
      max = max + amplitude;
      frequency = frequency * lacunarity;
      amplitude = amplitude * persistence;
      x = x + xOffset;
      y = y + yOffset;
    }
    return total / max;
  }

  function grad2D(xsb, ysb, dx, dy) {
    xsb = xsb | 0;
    ysb = ysb | 0;
    dx = +dx;
    dy = +dy;
    var i = 0;
    i = (getPerm(xsb & pMask) | 0) ^ (ysb & pMask);
    i = getPerm(i) | 0;
    return +heapF64[(gradients2D + (i << 4) + X) >> 3] * dx + +heapF64[(gradients2D + (i << 4) + Y) >> 3] * dy;
  }

  function eval2D(x, y) {
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
      value = value + attn1 * attn1 * +grad2D((xsb + 1) | 0, (ysb + 0) | 0, dx1, dy1);
    }

    // Contribution (0,1)
    dx2 = dx0 - 0.0 - +heapF64[squishConstant2D >> 3];
    dy2 = dy0 - 1.0 - +heapF64[squishConstant2D >> 3];
    attn2 = 2.0 - dx2 * dx2 - dy2 * dy2;
    if (attn2 > 0.0) {
      attn2 = attn2 * attn2;
      value = value + attn2 * attn2 * +grad2D((xsb + 0) | 0, (ysb + 1) | 0, dx2, dy2);
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
      value = value + attn0 * attn0 * +grad2D(xsb, ysb, dx0, dy0);
    }

    // Extra Vertex
    attn_ext = 2.0 - dx_ext * dx_ext - dy_ext * dy_ext;
    if (attn_ext > 0.0) {
      attn_ext = attn_ext * attn_ext;
      value = value + attn_ext * attn_ext * +grad2D(xsv_ext, ysv_ext, dx_ext, dy_ext);
    }
    return +normalize(value);
  }

  function noise3D(octaves, lacunarity, persistence, xOffset, yOffset, zOffset, x, y, z) {
    octaves = octaves | 0;
    lacunarity = +lacunarity;
    persistence = +persistence;
    xOffset = +xOffset;
    yOffset = +yOffset;
    zOffset = +zOffset;
    x = +x;
    y = +y;
    z = +z;
    var total = 0.0;
    var frequency = 1.0;
    var amplitude = 1.0;
    var max = 0.0;
    var i = 0;
    for (i = 0; (i | 0) < (octaves | 0); i = (i + 1) | 0) {
      total = total + +eval3D(x * frequency, y * frequency, z * frequency) * amplitude;
      max = max + amplitude;
      frequency = frequency * lacunarity;
      amplitude = amplitude * persistence;
      x = x + xOffset;
      y = y + yOffset;
      z = z + yOffset;
    }
    return total / max;
  }

  function eval3D(x, y, z) {
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

  // function eval3DXYBeforeZ(x, y, z) {
  //   x = +x;
  //   y = +y;
  //   z = +z;
  //   var xy = 0.0;
  //   var s2 = 0.0;
  //   var zz = 0.0;
  //   var xs = 0.0;
  //   var ys = 0.0;
  //   var zs = 0.0;
  //   // Combine rotation with skew transform.
  //   xy = x + y;
  //   s2 = xy * 0.211324865405187;
  //   zz = z * 0.288675134594813;
  //   xs = s2 - x + zz;
  //   ys = s2 - y + zz;
  //   zs = xy * 0.577350269189626 + zz;

  //   return +eval3DBase(xs, ys, zs);
  // }

  // function eval3DXZBeforeY(x, y, z) {
  //   x = +x;
  //   y = +y;
  //   z = +z;
  //   var xz = 0.0;
  //   var s2 = 0.0;
  //   var yy = 0.0;
  //   var xs = 0.0;
  //   var ys = 0.0;
  //   var zs = 0.0;
  //   // Combine rotation with skew transform.
  //   xz = x + z;
  //   s2 = xz * 0.211324865405187;
  //   yy = y * 0.288675134594813;
  //   xs = s2 - x + yy;
  //   zs = s2 - z + yy;
  //   ys = xz * 0.577350269189626 + yy;

  //   return +eval3DBase(xs, ys, zs);
  // }

  function grad3D(xsb, ysb, zsb, dx, dy, dz) {
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
        value = value + attn0 * attn0 * +grad3D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 0) | 0, dx0, dy0, dz0);
      }

      // Contribution (1,0,0)
      dx1 = dx0 - 1.0 - +heapF64[squishConstant3D >> 3];
      dy1 = dy0 - 0.0 - +heapF64[squishConstant3D >> 3];
      dz1 = dz0 - 0.0 - +heapF64[squishConstant3D >> 3];
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value = value + attn1 * attn1 * +grad3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, dx1, dy1, dz1);
      }

      // Contribution (0,1,0)
      dx2 = dx0 - 0.0 - +heapF64[squishConstant3D >> 3];
      dy2 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
      dz2 = dz1;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value = value + attn2 * attn2 * +grad3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx2, dy2, dz2);
      }

      // Contribution (0,0,1)
      dx3 = dx2;
      dy3 = dy1;
      dz3 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value = value + attn3 * attn3 * +grad3D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx3, dy3, dz3);
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
        value = value + attn3 * attn3 * +grad3D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx3, dy3, dz3);
      }

      // Contribution (1,0,1)
      dx2 = dx3;
      dy2 = dy0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dz2 = dz0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value = value + attn2 * attn2 * +grad3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx2, dy2, dz2);
      }

      // Contribution (0,1,1)
      dx1 = dx0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dy1 = dy3;
      dz1 = dz2;
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value = value + attn1 * attn1 * +grad3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, dx1, dy1, dz1);
      }

      // Contribution (1,1,1)
      dx0 = dx0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
      dy0 = dy0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
      dz0 = dz0 - 1.0 - 3.0 * heapF64[squishConstant3D >> 3];
      attn0 = 2.0 - dx0 * dx0 - dy0 * dy0 - dz0 * dz0;
      if (attn0 > 0.0) {
        attn0 = attn0 * attn0;
        value = value + attn0 * attn0 * +grad3D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 1) | 0, dx0, dy0, dz0);
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
        value = value + attn1 * attn1 * +grad3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, dx1, dy1, dz1);
      }

      // Contribution (0,1,0)
      dx2 = dx0 - 0.0 - +heapF64[squishConstant3D >> 3];
      dy2 = dy0 - 1.0 - +heapF64[squishConstant3D >> 3];
      dz2 = dz1;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value = value + attn2 * attn2 * +grad3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx2, dy2, dz2);
      }

      // Contribution (0,0,1)
      dx3 = dx2;
      dy3 = dy1;
      dz3 = dz0 - 1.0 - +heapF64[squishConstant3D >> 3];
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value = value + attn3 * attn3 * +grad3D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx3, dy3, dz3);
      }

      // Contribution (1,1,0)
      dx4 = dx0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dy4 = dy0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dz4 = dz0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      attn4 = 2.0 - dx4 * dx4 - dy4 * dy4 - dz4 * dz4;
      if (attn4 > 0.0) {
        attn4 = attn4 * attn4;
        value = value + attn4 * attn4 * +grad3D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, dx4, dy4, dz4);
      }

      // Contribution (1,0,1)
      dx5 = dx4;
      dy5 = dy0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dz5 = dz0 - 1.0 - 2.0 * heapF64[squishConstant3D >> 3];
      attn5 = 2.0 - dx5 * dx5 - dy5 * dy5 - dz5 * dz5;
      if (attn5 > 0.0) {
        attn5 = attn5 * attn5;
        value = value + attn5 * attn5 * +grad3D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, dx5, dy5, dz5);
      }

      // Contribution (0,1,1)
      dx6 = dx0 - 0.0 - 2.0 * heapF64[squishConstant3D >> 3];
      dy6 = dy4;
      dz6 = dz5;
      attn6 = 2.0 - dx6 * dx6 - dy6 * dy6 - dz6 * dz6;
      if (attn6 > 0.0) {
        attn6 = attn6 * attn6;
        value = value + attn6 * attn6 * +grad3D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, dx6, dy6, dz6);
      }
    }

    // First extra vertex
    attn_ext0 = 2.0 - dx_ext0 * dx_ext0 - dy_ext0 * dy_ext0 - dz_ext0 * dz_ext0;
    if (attn_ext0 > 0.0) {
      attn_ext0 = attn_ext0 * attn_ext0;
      value = value + attn_ext0 * attn_ext0 * +grad3D(xsv_ext0, ysv_ext0, zsv_ext0, dx_ext0, dy_ext0, dz_ext0);
    }

    // Second extra vertex
    attn_ext1 = 2.0 - dx_ext1 * dx_ext1 - dy_ext1 * dy_ext1 - dz_ext1 * dz_ext1;
    if (attn_ext1 > 0.0) {
      attn_ext1 = attn_ext1 * attn_ext1;
      value = value + attn_ext1 * attn_ext1 * +grad3D(xsv_ext1, ysv_ext1, zsv_ext1, dx_ext1, dy_ext1, dz_ext1);
    }

    return +normalize(value);
  }

  function noise4D(octaves, lacunarity, persistence, xOffset, yOffset, zOffset, wOffset, x, y, z, w) {
    octaves = octaves | 0;
    lacunarity = +lacunarity;
    persistence = +persistence;
    xOffset = +xOffset;
    yOffset = +yOffset;
    zOffset = +zOffset;
    wOffset = +wOffset;
    x = +x;
    y = +y;
    z = +z;
    w = +w;
    var total = 0.0;
    var frequency = 1.0;
    var amplitude = 1.0;
    var max = 0.0;
    var i = 0;
    for (i = 0; (i | 0) < (octaves | 0); i = (i + 1) | 0) {
      total = total + +eval4D(x * frequency, y * frequency, z * frequency, w * frequency) * amplitude;
      max = max + amplitude;
      frequency = frequency * lacunarity;
      amplitude = amplitude * persistence;
      x = x + xOffset;
      y = y + yOffset;
      z = z + yOffset;
      w = w + yOffset;
    }
    return total / max;
  }

  function eval4D(x, y, z, w) {
    x = +x;
    y = +y;
    z = +z;
    w = +w;
    var s = 0.0;
    var xs = 0.0;
    var ys = 0.0;
    var zs = 0.0;
    var ws = 0.0;

    // Get points for A4 lattice
    s = heapF64[stretchConstant4D >> 3] * (x + y + z + w);
    xs = x + s;
    ys = y + s;
    zs = z + s;
    ws = w + s;

    return +eval4DBase(xs, ys, zs, ws);
  }

  // function eval4DXYBeforeZW(x, y, z, w) {
  //   x = +x;
  //   y = +y;
  //   z = +z;
  //   w = +w;
  //   var s2 = 0.0;
  //   var t2 = 0.0;
  //   var xs = 0.0;
  //   var ys = 0.0;
  //   var zs = 0.0;
  //   var ws = 0.0;

  //   s2 = (x + y) * -0.178275657951399372 + (z + w) * 0.215623393288842828;
  //   t2 = (z + w) * -0.403949762580207112 + (x + y) * -0.375199083010075342;
  //   xs = x + s2;
  //   ys = y + s2;
  //   zs = z + t2;
  //   ws = w + t2;

  //   return +eval4DBase(xs, ys, zs, ws);
  // }

  // function eval4DXZBeforeYW(x, y, z, w) {
  //   x = +x;
  //   y = +y;
  //   z = +z;
  //   w = +w;
  //   var s2 = 0.0;
  //   var t2 = 0.0;
  //   var xs = 0.0;
  //   var ys = 0.0;
  //   var zs = 0.0;
  //   var ws = 0.0;

  //   s2 = (x + z) * -0.178275657951399372 + (y + w) * 0.215623393288842828;
  //   t2 = (y + w) * -0.403949762580207112 + (x + z) * -0.375199083010075342;
  //   xs = x + s2;
  //   ys = y + t2;
  //   zs = z + s2;
  //   ws = w + t2;

  //   return +eval4DBase(xs, ys, zs, ws);
  // }

  // function eval4DXYZBeforeW(x, y, z, w) {
  //   x = +x;
  //   y = +y;
  //   z = +z;
  //   w = +w;
  //   var xyz = 0.0;
  //   var ww = 0.0;
  //   var s2 = 0.0;
  //   var xs = 0.0;
  //   var ys = 0.0;
  //   var zs = 0.0;
  //   var ws = 0.0;

  //   xyz = x + y + z;
  //   ww = w * 0.2236067977499788;
  //   s2 = xyz * heapF64[stretchConstant3D >> 3] + ww;
  //   xs = x + s2;
  //   ys = y + s2;
  //   zs = z + s2;
  //   ws = -0.5 * xyz + ww;

  //   return +eval4DBase(xs, ys, zs, ws);
  // }

  function grad4D(xsb, ysb, zsb, wsb, dx, dy, dz, dw) {
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
      +heapF64[(gradients4D + (i << 5) + X) >> 3] * dx +
      +heapF64[(gradients4D + (i << 5) + Y) >> 3] * dy +
      +heapF64[(gradients4D + (i << 5) + Z) >> 3] * dz +
      +heapF64[(gradients4D + (i << 5) + W) >> 3] * dw
    );
  }

  function eval4DBase(xs, ys, zs, ws) {
    xs = +xs;
    ys = +ys;
    zs = +zs;
    ws = +ws;
    var value = 0.0;
    var xsb = 0;
    var ysb = 0;
    var zsb = 0;
    var wsb = 0;
    var xins = 0.0;
    var yins = 0.0;
    var zins = 0.0;
    var wins = 0.0;
    var uins = 0.0;
    var inSum = 0.0;
    var squishOffsetIns = 0.0;
    var dx0 = 0.0;
    var dy0 = 0.0;
    var dz0 = 0.0;
    var dw0 = 0.0;
    var dx1 = 0.0;
    var dy1 = 0.0;
    var dz1 = 0.0;
    var dw1 = 0.0;
    var dx2 = 0.0;
    var dy2 = 0.0;
    var dz2 = 0.0;
    var dw2 = 0.0;
    var dx3 = 0.0;
    var dy3 = 0.0;
    var dz3 = 0.0;
    var dw3 = 0.0;
    var dx4 = 0.0;
    var dy4 = 0.0;
    var dz4 = 0.0;
    var dw4 = 0.0;
    var dx5 = 0.0;
    var dy5 = 0.0;
    var dz5 = 0.0;
    var dw5 = 0.0;
    var dx6 = 0.0;
    var dy6 = 0.0;
    var dz6 = 0.0;
    var dw6 = 0.0;
    var dx7 = 0.0;
    var dy7 = 0.0;
    var dz7 = 0.0;
    var dw7 = 0.0;
    var dx8 = 0.0;
    var dy8 = 0.0;
    var dz8 = 0.0;
    var dw8 = 0.0;
    var dx9 = 0.0;
    var dy9 = 0.0;
    var dz9 = 0.0;
    var dw9 = 0.0;
    var dx10 = 0.0;
    var dy10 = 0.0;
    var dz10 = 0.0;
    var dw10 = 0.0;

    var attn0 = 0.0;
    var attn1 = 0.0;
    var attn2 = 0.0;
    var attn3 = 0.0;
    var attn4 = 0.0;
    var attn5 = 0.0;
    var attn6 = 0.0;
    var attn7 = 0.0;
    var attn8 = 0.0;
    var attn9 = 0.0;
    var attn10 = 0.0;

    var dx_ext0 = 0.0;
    var dy_ext0 = 0.0;
    var dz_ext0 = 0.0;
    var dw_ext0 = 0.0;
    var dx_ext1 = 0.0;
    var dy_ext1 = 0.0;
    var dz_ext1 = 0.0;
    var dw_ext1 = 0.0;
    var dx_ext2 = 0.0;
    var dy_ext2 = 0.0;
    var dz_ext2 = 0.0;
    var dw_ext2 = 0.0;

    var xsv_ext0 = 0;
    var ysv_ext0 = 0;
    var zsv_ext0 = 0;
    var wsv_ext0 = 0;
    var xsv_ext1 = 0;
    var ysv_ext1 = 0;
    var zsv_ext1 = 0;
    var wsv_ext1 = 0;
    var xsv_ext2 = 0;
    var ysv_ext2 = 0;
    var zsv_ext2 = 0;
    var wsv_ext2 = 0;

    var attn_ext0 = 0.0;
    var attn_ext1 = 0.0;
    var attn_ext2 = 0.0;

    var aPoint = 0;
    var aScore = 0.0;
    var bPoint = 0;
    var bScore = 0.0;

    var aIsBiggerSide = 0;
    var bIsBiggerSide = 0;
    var aIsFurtherSide = 0;
    var bIsFurtherSide = 0;

    var c = 0;
    var c1 = 0;
    var c2 = 0;
    var score = 0.0;

    var p1 = 0.0;
    var p2 = 0.0;
    var p3 = 0.0;
    var p4 = 0.0;

    // Floor to get simplectic honeycomb coordinates of rhombo-hypercube super-cell origin.
    xsb = ~~floor(xs);
    ysb = ~~floor(ys);
    zsb = ~~floor(zs);
    wsb = ~~floor(ws);

    // Compute simplectic honeycomb coordinates relative to rhombo-hypercube origin.
    xins = xs - +(xsb | 0);
    yins = ys - +(ysb | 0);
    zins = zs - +(zsb | 0);
    wins = ws - +(wsb | 0);

    // Sum those together to get a value that determines which region we're in.
    inSum = xins + yins + zins + wins;

    // Positions relative to origin point.
    squishOffsetIns = inSum * heapF64[squishConstant4D >> 3];
    dx0 = xins + squishOffsetIns;
    dy0 = yins + squishOffsetIns;
    dz0 = zins + squishOffsetIns;
    dw0 = wins + squishOffsetIns;

    if (inSum <= 1.0) {
      // We're inside the pentachoron (4-Simplex) at (0,0,0,0)

      // Determine which two of (0,0,0,1), (0,0,1,0), (0,1,0,0), (1,0,0,0) are closest.
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
      if ((aScore >= bScore) & (wins > bScore)) {
        bScore = wins;
        bPoint = 0x08;
      } else if ((aScore < bScore) & (wins > aScore)) {
        aScore = wins;
        aPoint = 0x08;
      }

      // Now we determine the three lattice points not part of the pentachoron that may contribute.
      // This depends on the closest two pentachoron vertices, including (0,0,0,0)
      uins = 1.0 - inSum;
      if ((uins > aScore) | (uins > bScore)) {
        // (0,0,0,0) is one of the closest two pentachoron vertices.
        c = bScore > aScore ? bPoint : aPoint; // Our other closest vertex is the closest out of a and b.
        if ((c & 0x01) == 0) {
          xsv_ext0 = (xsb - 1) | 0;
          xsv_ext1 = xsv_ext2 = xsb;
          dx_ext0 = dx0 + 1.0;
          dx_ext1 = dx_ext2 = dx0;
        } else {
          xsv_ext0 = xsv_ext1 = xsv_ext2 = (xsb + 1) | 0;
          dx_ext0 = dx_ext1 = dx_ext2 = dx0 - 1.0;
        }

        if ((c & 0x02) == 0) {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = ysb;
          dy_ext0 = dy_ext1 = dy_ext2 = dy0;
          if ((c & 0x01) == 0x01) {
            ysv_ext0 = (ysv_ext0 - 1) | 0;
            dy_ext0 = dy_ext0 + 1.0;
          } else {
            ysv_ext1 = (ysv_ext1 - 1) | 0;
            dy_ext1 = dy_ext1 + 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = (ysb + 1) | 0;
          dy_ext0 = dy_ext1 = dy_ext2 = dy0 - 1.0;
        }

        if ((c & 0x04) == 0) {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = zsb;
          dz_ext0 = dz_ext1 = dz_ext2 = dz0;
          if ((c & 0x03) != 0) {
            if ((c & 0x03) == 0x03) {
              zsv_ext0 = (zsv_ext0 - 1) | 0;
              dz_ext0 = dz_ext0 + 1.0;
            } else {
              zsv_ext1 = (zsv_ext1 - 1) | 0;
              dz_ext1 = dz_ext1 + 1.0;
            }
          } else {
            zsv_ext2 = (zsv_ext2 - 1) | 0;
            dz_ext2 = dz_ext2 + 1.0;
          }
        } else {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = (zsb + 1) | 0;
          dz_ext0 = dz_ext1 = dz_ext2 = dz0 - 1.0;
        }

        if ((c & 0x08) == 0) {
          wsv_ext0 = wsv_ext1 = wsb;
          wsv_ext2 = (wsb - 1) | 0;
          dw_ext0 = dw_ext1 = dw0;
          dw_ext2 = dw0 + 1.0;
        } else {
          wsv_ext0 = wsv_ext1 = wsv_ext2 = (wsb + 1) | 0;
          dw_ext0 = dw_ext1 = dw_ext2 = dw0 - 1.0;
        }
      } else {
        // (0,0,0,0) is not one of the closest two pentachoron vertices.
        c = (aPoint | bPoint) & 0xff; // Our three extra vertices are determined by the closest two.

        if ((c & 0x01) == 0) {
          xsv_ext0 = xsv_ext2 = xsb;
          xsv_ext1 = (xsb - 1) | 0;
          dx_ext0 = dx0 - 2.0 * heapF64[squishConstant4D >> 3];
          dx_ext1 = dx0 + 1.0 - +heapF64[squishConstant4D >> 3];
          dx_ext2 = dx0 - +heapF64[squishConstant4D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = xsv_ext2 = (xsb + 1) | 0;
          dx_ext0 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dx_ext1 = dx_ext2 = dx0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x02) == 0) {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = ysb;
          dy_ext0 = dy0 - 2.0 * heapF64[squishConstant4D >> 3];
          dy_ext1 = dy_ext2 = dy0 - +heapF64[squishConstant4D >> 3];
          if ((c & 0x01) == 0x01) {
            ysv_ext1 = (ysv_ext1 - 1) | 0;
            dy_ext1 = dy_ext1 + 1.0;
          } else {
            ysv_ext2 = (ysv_ext2 - 1) | 0;
            dy_ext2 = dy_ext2 + 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = (ysb + 1) | 0;
          dy_ext0 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dy_ext1 = dy_ext2 = dy0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x04) == 0) {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = zsb;
          dz_ext0 = dz0 - 2.0 * heapF64[squishConstant4D >> 3];
          dz_ext1 = dz_ext2 = dz0 - +heapF64[squishConstant4D >> 3];
          if ((c & 0x03) == 0x03) {
            zsv_ext1 = (zsv_ext1 - 1) | 0;
            dz_ext1 = dz_ext1 + 1.0;
          } else {
            zsv_ext2 = (zsv_ext2 - 1) | 0;
            dz_ext2 = dz_ext2 + 1.0;
          }
        } else {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = (zsb + 1) | 0;
          dz_ext0 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dz_ext1 = dz_ext2 = dz0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x08) == 0) {
          wsv_ext0 = wsv_ext1 = wsb;
          wsv_ext2 = (wsb - 1) | 0;
          dw_ext0 = dw0 - 2.0 * heapF64[squishConstant4D >> 3];
          dw_ext1 = dw0 - +heapF64[squishConstant4D >> 3];
          dw_ext2 = dw0 + 1.0 - +heapF64[squishConstant4D >> 3];
        } else {
          wsv_ext0 = wsv_ext1 = wsv_ext2 = (wsb + 1) | 0;
          dw_ext0 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dw_ext1 = dw_ext2 = dw0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }
      }

      // Contribution (0,0,0,0)
      attn0 = 2.0 - dx0 * dx0 - dy0 * dy0 - dz0 * dz0 - dw0 * dw0;
      if (attn0 > 0.0) {
        attn0 = attn0 * attn0;
        value =
          value +
          attn0 * attn0 * +grad4D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 0) | 0, (wsb + 0) | 0, dx0, dy0, dz0, dw0);
      }

      // Contribution (1,0,0,0)
      dx1 = dx0 - 1.0 - +heapF64[squishConstant4D >> 3];
      dy1 = dy0 - 0.0 - +heapF64[squishConstant4D >> 3];
      dz1 = dz0 - 0.0 - +heapF64[squishConstant4D >> 3];
      dw1 = dw0 - 0.0 - +heapF64[squishConstant4D >> 3];
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1 - dw1 * dw1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value =
          value +
          attn1 * attn1 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, (wsb + 0) | 0, dx1, dy1, dz1, dw1);
      }

      // Contribution (0,1,0,0)
      dx2 = dx0 - 0.0 - +heapF64[squishConstant4D >> 3];
      dy2 = dy0 - 1.0 - +heapF64[squishConstant4D >> 3];
      dz2 = dz1;
      dw2 = dw1;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2 - dw2 * dw2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value =
          value +
          attn2 * attn2 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 0) | 0, dx2, dy2, dz2, dw2);
      }

      // Contribution (0,0,1,0)
      dx3 = dx2;
      dy3 = dy1;
      dz3 = dz0 - 1.0 - +heapF64[squishConstant4D >> 3];
      dw3 = dw1;
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3 - dw3 * dw3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value =
          value +
          attn3 * attn3 * +grad4D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx3, dy3, dz3, dw3);
      }

      // Contribution (0,0,0,1)
      dx4 = dx2;
      dy4 = dy1;
      dz4 = dz1;
      dw4 = dw0 - 1.0 - +heapF64[squishConstant4D >> 3];
      attn4 = 2.0 - dx4 * dx4 - dy4 * dy4 - dz4 * dz4 - dw4 * dw4;
      if (attn4 > 0.0) {
        attn4 = attn4 * attn4;
        value =
          value +
          attn4 * attn4 * +grad4D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx4, dy4, dz4, dw4);
      }
    } else if (inSum >= 3.0) {
      // We're inside the pentachoron (4-Simplex) at (1,1,1,1)
      // Determine which two of (1,1,1,0), (1,1,0,1), (1,0,1,1), (0,1,1,1) are closest.
      aPoint = 0x0e;
      aScore = xins;
      bPoint = 0x0d;
      bScore = yins;
      if ((aScore <= bScore) & (zins < bScore)) {
        bScore = zins;
        bPoint = 0x0b;
      } else if ((aScore > bScore) & (zins < aScore)) {
        aScore = zins;
        aPoint = 0x0b;
      }
      if ((aScore <= bScore) & (wins < bScore)) {
        bScore = wins;
        bPoint = 0x07;
      } else if ((aScore > bScore) & (wins < aScore)) {
        aScore = wins;
        aPoint = 0x07;
      }

      // Now we determine the three lattice points not part of the pentachoron that may contribute.
      // This depends on the closest two pentachoron vertices, including (0,0,0,0)
      uins = 4.0 - inSum;
      if ((uins < aScore) | (uins < bScore)) {
        // (1,1,1,1) is one of the closest two pentachoron vertices.
        c = bScore < aScore ? bPoint : aPoint; // Our other closest vertex is the closest out of a and b.

        if ((c & 0x01) != 0) {
          xsv_ext0 = (xsb + 2) | 0;
          xsv_ext1 = xsv_ext2 = (xsb + 1) | 0;
          dx_ext0 = dx0 - 2.0 - 4.0 * heapF64[squishConstant4D >> 3];
          dx_ext1 = dx_ext2 = dx0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = xsv_ext2 = xsb;
          dx_ext0 = dx_ext1 = dx_ext2 = dx0 - 4.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x02) != 0) {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = (ysb + 1) | 0;
          dy_ext0 = dy_ext1 = dy_ext2 = dy0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
          if ((c & 0x01) != 0) {
            ysv_ext1 = (ysv_ext1 + 1) | 0;
            dy_ext1 = dy_ext1 - 1.0;
          } else {
            ysv_ext0 = (ysv_ext0 + 1) | 0;
            dy_ext0 = dy_ext0 - 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = ysb;
          dy_ext0 = dy_ext1 = dy_ext2 = dy0 - 4.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x04) != 0) {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = (zsb + 1) | 0;
          dz_ext0 = dz_ext1 = dz_ext2 = dz0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
          if ((c & 0x03) != 0x03) {
            if ((c & 0x03) == 0) {
              zsv_ext0 = (zsv_ext0 + 1) | 0;
              dz_ext0 = dz_ext0 - 1.0;
            } else {
              zsv_ext1 = (zsv_ext1 + 1) | 0;
              dz_ext1 = dz_ext1 - 1.0;
            }
          } else {
            zsv_ext2 = (zsv_ext2 + 1) | 0;
            dz_ext2 = dz_ext2 - 1.0;
          }
        } else {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = zsb;
          dz_ext0 = dz_ext1 = dz_ext2 = dz0 - 4.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x08) != 0) {
          wsv_ext0 = wsv_ext1 = (wsb + 1) | 0;
          wsv_ext2 = (wsb + 2) | 0;
          dw_ext0 = dw_ext1 = dw0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
          dw_ext2 = dw0 - 2.0 - 4.0 * heapF64[squishConstant4D >> 3];
        } else {
          wsv_ext0 = wsv_ext1 = wsv_ext2 = wsb;
          dw_ext0 = dw_ext1 = dw_ext2 = dw0 - 4.0 * heapF64[squishConstant4D >> 3];
        }
      } else {
        // (1,1,1,1) is not one of the closest two pentachoron vertices.
        c = aPoint & bPoint & 0xff; // Our three extra vertices are determined by the closest two.

        if ((c & 0x01) != 0) {
          xsv_ext0 = xsv_ext2 = (xsb + 1) | 0;
          xsv_ext1 = (xsb + 2) | 0;
          dx_ext0 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dx_ext1 = dx0 - 2.0 - 3.0 * heapF64[squishConstant4D >> 3];
          dx_ext2 = dx0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = xsv_ext2 = xsb;
          dx_ext0 = dx0 - 2.0 * heapF64[squishConstant4D >> 3];
          dx_ext1 = dx_ext2 = dx0 - 3.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x02) != 0) {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = (ysb + 1) | 0;
          dy_ext0 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dy_ext1 = dy_ext2 = dy0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
          if ((c & 0x01) != 0) {
            ysv_ext2 = (ysv_ext2 + 1) | 0;
            dy_ext2 = dy_ext2 - 1.0;
          } else {
            ysv_ext1 = (ysv_ext1 + 1) | 0;
            dy_ext1 = dy_ext1 - 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = ysv_ext2 = ysb;
          dy_ext0 = dy0 - 2.0 * heapF64[squishConstant4D >> 3];
          dy_ext1 = dy_ext2 = dy0 - 3.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x04) != 0) {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = (zsb + 1) | 0;
          dz_ext0 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dz_ext1 = dz_ext2 = dz0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
          if ((c & 0x03) != 0) {
            zsv_ext2 = (zsv_ext2 + 1) | 0;
            dz_ext2 = dz_ext2 - 1.0;
          } else {
            zsv_ext1 = (zsv_ext1 + 1) | 0;
            dz_ext1 = dz_ext1 - 1.0;
          }
        } else {
          zsv_ext0 = zsv_ext1 = zsv_ext2 = zsb;
          dz_ext0 = dz0 - 2.0 * heapF64[squishConstant4D >> 3];
          dz_ext1 = dz_ext2 = dz0 - 3.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c & 0x08) != 0) {
          wsv_ext0 = wsv_ext1 = (wsb + 1) | 0;
          wsv_ext2 = (wsb + 2) | 0;
          dw_ext0 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dw_ext1 = dw0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
          dw_ext2 = dw0 - 2.0 - 3.0 * heapF64[squishConstant4D >> 3];
        } else {
          wsv_ext0 = wsv_ext1 = wsv_ext2 = wsb;
          dw_ext0 = dw0 - 2.0 * heapF64[squishConstant4D >> 3];
          dw_ext1 = dw_ext2 = dw0 - 3.0 * heapF64[squishConstant4D >> 3];
        }
      }

      // Contribution (1,1,1,0)
      dx4 = dx0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      dy4 = dy0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      dz4 = dz0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      dw4 = dw0 - 3.0 * heapF64[squishConstant4D >> 3];
      attn4 = 2.0 - dx4 * dx4 - dy4 * dy4 - dz4 * dz4 - dw4 * dw4;
      if (attn4 > 0.0) {
        attn4 = attn4 * attn4;
        value =
          value +
          attn4 * attn4 * +grad4D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx4, dy4, dz4, dw4);
      }

      // Contribution (1,1,0,1)
      dx3 = dx4;
      dy3 = dy4;
      dz3 = dz0 - 3.0 * heapF64[squishConstant4D >> 3];
      dw3 = dw0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3 - dw3 * dw3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value =
          value +
          attn3 * attn3 * +grad4D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx3, dy3, dz3, dw3);
      }

      // Contribution (1,0,1,1)
      dx2 = dx4;
      dy2 = dy0 - 3.0 * heapF64[squishConstant4D >> 3];
      dz2 = dz4;
      dw2 = dw3;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2 - dw2 * dw2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value =
          value +
          attn2 * attn2 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 1) | 0, dx2, dy2, dz2, dw2);
      }

      // Contribution (0,1,1,1)
      dx1 = dx0 - 3.0 * heapF64[squishConstant4D >> 3];
      dz1 = dz4;
      dy1 = dy4;
      dw1 = dw3;
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1 - dw1 * dw1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value =
          value +
          attn1 * attn1 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, (wsb + 1) | 0, dx1, dy1, dz1, dw1);
      }

      // Contribution (1,1,1,1)
      dx0 = dx0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
      dy0 = dy0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
      dz0 = dz0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
      dw0 = dw0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
      attn0 = 2.0 - dx0 * dx0 - dy0 * dy0 - dz0 * dz0 - dw0 * dw0;
      if (attn0 > 0.0) {
        attn0 = attn0 * attn0;
        value =
          value +
          attn0 * attn0 * +grad4D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 1) | 0, (wsb + 1) | 0, dx0, dy0, dz0, dw0);
      }
    } else if (inSum <= 2.0) {
      // We're inside the first dispentachoron (Rectified 4-Simplex)
      aIsBiggerSide = 1;
      bIsBiggerSide = 1;

      // Decide between (1,1,0,0) and (0,0,1,1)
      if (xins + yins > zins + wins) {
        aScore = xins + yins;
        aPoint = 0x03;
      } else {
        aScore = zins + wins;
        aPoint = 0x0c;
      }

      // Decide between (1,0,1,0) and (0,1,0,1)
      if (xins + zins > yins + wins) {
        bScore = xins + zins;
        bPoint = 0x05;
      } else {
        bScore = yins + wins;
        bPoint = 0x0a;
      }

      // Closer between (1,0,0,1) and (0,1,1,0) will replace the further of a and b, if closer.
      if (xins + wins > yins + zins) {
        score = xins + wins;
        if ((aScore >= bScore) & (score > bScore)) {
          bScore = score;
          bPoint = 0x09;
        } else if ((aScore < bScore) & (score > aScore)) {
          aScore = score;
          aPoint = 0x09;
        }
      } else {
        score = yins + zins;
        if ((aScore >= bScore) & (score > bScore)) {
          bScore = score;
          bPoint = 0x06;
        } else if ((aScore < bScore) & (score > aScore)) {
          aScore = score;
          aPoint = 0x06;
        }
      }

      // Decide if (1,0,0,0) is closer.
      p1 = 2.0 - inSum + xins;
      if ((aScore >= bScore) & (p1 > bScore)) {
        bScore = p1;
        bPoint = 0x01;
        bIsBiggerSide = 0;
      } else if ((aScore < bScore) & (p1 > aScore)) {
        aScore = p1;
        aPoint = 0x01;
        aIsBiggerSide = 0;
      }

      // Decide if (0,1,0,0) is closer.
      p2 = 2.0 - inSum + yins;
      if ((aScore >= bScore) & (p2 > bScore)) {
        bScore = p2;
        bPoint = 0x02;
        bIsBiggerSide = 0;
      } else if ((aScore < bScore) & (p2 > aScore)) {
        aScore = p2;
        aPoint = 0x02;
        aIsBiggerSide = 0;
      }

      // Decide if (0,0,1,0) is closer.
      p3 = 2.0 - inSum + zins;
      if ((aScore >= bScore) & (p3 > bScore)) {
        bScore = p3;
        bPoint = 0x04;
        bIsBiggerSide = 0;
      } else if ((aScore < bScore) & (p3 > aScore)) {
        aScore = p3;
        aPoint = 0x04;
        aIsBiggerSide = 0;
      }

      // Decide if (0,0,0,1) is closer.
      p4 = 2.0 - inSum + wins;
      if ((aScore >= bScore) & (p4 > bScore)) {
        bScore = p4;
        bPoint = 0x08;
        bIsBiggerSide = 0;
      } else if ((aScore < bScore) & (p4 > aScore)) {
        aScore = p4;
        aPoint = 0x08;
        aIsBiggerSide = 0;
      }

      // Where each of the two closest points are determines how the extra three vertices are calculated.
      if ((aIsBiggerSide | 0) == (bIsBiggerSide | 0)) {
        if (aIsBiggerSide) {
          // Both closest points on the bigger side
          c1 = (aPoint | bPoint) & 0xff;
          c2 = aPoint & bPoint & 0xff;
          if ((c1 & 0x01) == 0) {
            xsv_ext0 = xsb;
            xsv_ext1 = (xsb - 1) | 0;
            dx_ext0 = dx0 - 3.0 * heapF64[squishConstant4D >> 3];
            dx_ext1 = dx0 + 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          } else {
            xsv_ext0 = xsv_ext1 = (xsb + 1) | 0;
            dx_ext0 = dx0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
            dx_ext1 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          }

          if ((c1 & 0x02) == 0) {
            ysv_ext0 = ysb;
            ysv_ext1 = (ysb - 1) | 0;
            dy_ext0 = dy0 - 3.0 * heapF64[squishConstant4D >> 3];
            dy_ext1 = dy0 + 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          } else {
            ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
            dy_ext0 = dy0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
            dy_ext1 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          }

          if ((c1 & 0x04) == 0) {
            zsv_ext0 = zsb;
            zsv_ext1 = (zsb - 1) | 0;
            dz_ext0 = dz0 - 3.0 * heapF64[squishConstant4D >> 3];
            dz_ext1 = dz0 + 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          } else {
            zsv_ext0 = zsv_ext1 = (zsb + 1) | 0;
            dz_ext0 = dz0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
            dz_ext1 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          }

          if ((c1 & 0x08) == 0) {
            wsv_ext0 = wsb;
            wsv_ext1 = (wsb - 1) | 0;
            dw_ext0 = dw0 - 3.0 * heapF64[squishConstant4D >> 3];
            dw_ext1 = dw0 + 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          } else {
            wsv_ext0 = wsv_ext1 = (wsb + 1) | 0;
            dw_ext0 = dw0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
            dw_ext1 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          }

          // One combination is a permutation of (0,0,0,2) based on c2
          xsv_ext2 = xsb;
          ysv_ext2 = ysb;
          zsv_ext2 = zsb;
          wsv_ext2 = wsb;
          dx_ext2 = dx0 - 2.0 * heapF64[squishConstant4D >> 3];
          dy_ext2 = dy0 - 2.0 * heapF64[squishConstant4D >> 3];
          dz_ext2 = dz0 - 2.0 * heapF64[squishConstant4D >> 3];
          dw_ext2 = dw0 - 2.0 * heapF64[squishConstant4D >> 3];
          if ((c2 & 0x01) != 0) {
            xsv_ext2 = (xsv_ext2 + 2) | 0;
            dx_ext2 = dx_ext2 - 2.0;
          } else if ((c2 & 0x02) != 0) {
            ysv_ext2 = (ysv_ext2 + 2) | 0;
            dy_ext2 = dy_ext2 - 2.0;
          } else if ((c2 & 0x04) != 0) {
            zsv_ext2 = (zsv_ext2 + 2) | 0;
            dz_ext2 = dz_ext2 - 2.0;
          } else {
            wsv_ext2 = (wsv_ext2 + 2) | 0;
            dw_ext2 = dw_ext2 - 2.0;
          }
        } else {
          // Both closest points on the smaller side
          // One of the two extra points is (0,0,0,0)
          xsv_ext2 = xsb;
          ysv_ext2 = ysb;
          zsv_ext2 = zsb;
          wsv_ext2 = wsb;
          dx_ext2 = dx0;
          dy_ext2 = dy0;
          dz_ext2 = dz0;
          dw_ext2 = dw0;

          // Other two points are based on the omitted axes.
          c = (aPoint | bPoint) & 0xff;

          if ((c & 0x01) == 0) {
            xsv_ext0 = (xsb - 1) | 0;
            xsv_ext1 = xsb;
            dx_ext0 = dx0 + 1.0 - +heapF64[squishConstant4D >> 3];
            dx_ext1 = dx0 - +heapF64[squishConstant4D >> 3];
          } else {
            xsv_ext0 = xsv_ext1 = (xsb + 1) | 0;
            dx_ext0 = dx_ext1 = dx0 - 1.0 - +heapF64[squishConstant4D >> 3];
          }

          if ((c & 0x02) == 0) {
            ysv_ext0 = ysv_ext1 = ysb;
            dy_ext0 = dy_ext1 = dy0 - +heapF64[squishConstant4D >> 3];
            if ((c & 0x01) == 0x01) {
              ysv_ext0 = (ysv_ext0 - 1) | 0;
              dy_ext0 = dy_ext0 + 1.0;
            } else {
              ysv_ext1 = (ysv_ext1 - 1) | 0;
              dy_ext1 = dy_ext1 + 1.0;
            }
          } else {
            ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
            dy_ext0 = dy_ext1 = dy0 - 1.0 - +heapF64[squishConstant4D >> 3];
          }

          if ((c & 0x04) == 0) {
            zsv_ext0 = zsv_ext1 = zsb;
            dz_ext0 = dz_ext1 = dz0 - +heapF64[squishConstant4D >> 3];
            if ((c & 0x03) == 0x03) {
              zsv_ext0 = (zsv_ext0 - 1) | 0;
              dz_ext0 = dz_ext0 + 1.0;
            } else {
              zsv_ext1 = (zsv_ext1 - 1) | 0;
              dz_ext1 = dz_ext1 + 1.0;
            }
          } else {
            zsv_ext0 = zsv_ext1 = (zsb + 1) | 0;
            dz_ext0 = dz_ext1 = dz0 - 1.0 - +heapF64[squishConstant4D >> 3];
          }

          if ((c & 0x08) == 0) {
            wsv_ext0 = wsb;
            wsv_ext1 = (wsb - 1) | 0;
            dw_ext0 = dw0 - +heapF64[squishConstant4D >> 3];
            dw_ext1 = dw0 + 1.0 - +heapF64[squishConstant4D >> 3];
          } else {
            wsv_ext0 = wsv_ext1 = (wsb + 1) | 0;
            dw_ext0 = dw_ext1 = dw0 - 1.0 - +heapF64[squishConstant4D >> 3];
          }
        }
      } else {
        // One point on each "side"
        c1, c2;
        if (aIsBiggerSide) {
          c1 = aPoint;
          c2 = bPoint;
        } else {
          c1 = bPoint;
          c2 = aPoint;
        }

        // Two contributions are the bigger-sided point with each 0 replaced with -1.
        if ((c1 & 0x01) == 0) {
          xsv_ext0 = (xsb - 1) | 0;
          xsv_ext1 = xsb;
          dx_ext0 = dx0 + 1.0 - +heapF64[squishConstant4D >> 3];
          dx_ext1 = dx0 - +heapF64[squishConstant4D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = (xsb + 1) | 0;
          dx_ext0 = dx_ext1 = dx0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }

        if ((c1 & 0x02) == 0) {
          ysv_ext0 = ysv_ext1 = ysb;
          dy_ext0 = dy_ext1 = dy0 - +heapF64[squishConstant4D >> 3];
          if ((c1 & 0x01) == 0x01) {
            ysv_ext0 = (ysv_ext0 - 1) | 0;
            dy_ext0 = dy_ext0 + 1.0;
          } else {
            ysv_ext1 = (ysv_ext1 - 1) | 0;
            dy_ext1 = dy_ext1 + 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
          dy_ext0 = dy_ext1 = dy0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }

        if ((c1 & 0x04) == 0) {
          zsv_ext0 = zsv_ext1 = zsb;
          dz_ext0 = dz_ext1 = dz0 - +heapF64[squishConstant4D >> 3];
          if ((c1 & 0x03) == 0x03) {
            zsv_ext0 = (zsv_ext0 - 1) | 0;
            dz_ext0 = dz_ext0 + 1.0;
          } else {
            zsv_ext1 = (zsv_ext1 - 1) | 0;
            dz_ext1 = dz_ext1 + 1.0;
          }
        } else {
          zsv_ext0 = zsv_ext1 = (zsb + 1) | 0;
          dz_ext0 = dz_ext1 = dz0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }

        if ((c1 & 0x08) == 0) {
          wsv_ext0 = wsb;
          wsv_ext1 = (wsb - 1) | 0;
          dw_ext0 = dw0 - +heapF64[squishConstant4D >> 3];
          dw_ext1 = dw0 + 1.0 - +heapF64[squishConstant4D >> 3];
        } else {
          wsv_ext0 = wsv_ext1 = (wsb + 1) | 0;
          dw_ext0 = dw_ext1 = dw0 - 1.0 - +heapF64[squishConstant4D >> 3];
        }

        // One contribution is a permutation of (0,0,0,2) based on the smaller-sided point
        xsv_ext2 = xsb;
        ysv_ext2 = ysb;
        zsv_ext2 = zsb;
        wsv_ext2 = wsb;
        dx_ext2 = dx0 - 2.0 * heapF64[squishConstant4D >> 3];
        dy_ext2 = dy0 - 2.0 * heapF64[squishConstant4D >> 3];
        dz_ext2 = dz0 - 2.0 * heapF64[squishConstant4D >> 3];
        dw_ext2 = dw0 - 2.0 * heapF64[squishConstant4D >> 3];
        if ((c2 & 0x01) != 0) {
          xsv_ext2 = (xsv_ext2 + 2) | 0;
          dx_ext2 = dx_ext2 - 2.0;
        } else if ((c2 & 0x02) != 0) {
          ysv_ext2 = (ysv_ext2 + 2) | 0;
          dy_ext2 = dy_ext2 - 2.0;
        } else if ((c2 & 0x04) != 0) {
          zsv_ext2 = (zsv_ext2 + 2) | 0;
          dz_ext2 = dz_ext2 - 2.0;
        } else {
          wsv_ext2 = (wsv_ext2 + 2) | 0;
          dw_ext2 = dw_ext2 - 2.0;
        }
      }

      // Contribution (1,0,0,0)
      dx1 = dx0 - 1.0 - +heapF64[squishConstant4D >> 3];
      dy1 = dy0 - 0.0 - +heapF64[squishConstant4D >> 3];
      dz1 = dz0 - 0.0 - +heapF64[squishConstant4D >> 3];
      dw1 = dw0 - 0.0 - +heapF64[squishConstant4D >> 3];
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1 - dw1 * dw1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value =
          value +
          attn1 * attn1 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, (wsb + 0) | 0, dx1, dy1, dz1, dw1);
      }

      // Contribution (0,1,0,0)
      dx2 = dx0 - 0.0 - +heapF64[squishConstant4D >> 3];
      dy2 = dy0 - 1.0 - +heapF64[squishConstant4D >> 3];
      dz2 = dz1;
      dw2 = dw1;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2 - dw2 * dw2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value =
          value +
          attn2 * attn2 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 0) | 0, dx2, dy2, dz2, dw2);
      }

      // Contribution (0,0,1,0)
      dx3 = dx2;
      dy3 = dy1;
      dz3 = dz0 - 1.0 - +heapF64[squishConstant4D >> 3];
      dw3 = dw1;
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3 - dw3 * dw3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value =
          value +
          attn3 * attn3 * +grad4D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx3, dy3, dz3, dw3);
      }

      // Contribution (0,0,0,1)
      dx4 = dx2;
      dy4 = dy1;
      dz4 = dz1;
      dw4 = dw0 - 1.0 - +heapF64[squishConstant4D >> 3];
      attn4 = 2.0 - dx4 * dx4 - dy4 * dy4 - dz4 * dz4 - dw4 * dw4;
      if (attn4 > 0.0) {
        attn4 = attn4 * attn4;
        value =
          value +
          attn4 * attn4 * +grad4D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx4, dy4, dz4, dw4);
      }

      // Contribution (1,1,0,0)
      dx5 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy5 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz5 = dz0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw5 = dw0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn5 = 2.0 - dx5 * dx5 - dy5 * dy5 - dz5 * dz5 - dw5 * dw5;
      if (attn5 > 0.0) {
        attn5 = attn5 * attn5;
        value =
          value +
          attn5 * attn5 * +grad4D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 0) | 0, dx5, dy5, dz5, dw5);
      }

      // Contribution (1,0,1,0)
      dx6 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy6 = dy0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz6 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw6 = dw0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn6 = 2.0 - dx6 * dx6 - dy6 * dy6 - dz6 * dz6 - dw6 * dw6;
      if (attn6 > 0.0) {
        attn6 = attn6 * attn6;
        value =
          value +
          attn6 * attn6 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx6, dy6, dz6, dw6);
      }

      // Contribution (1,0,0,1)
      dx7 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy7 = dy0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz7 = dz0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw7 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn7 = 2.0 - dx7 * dx7 - dy7 * dy7 - dz7 * dz7 - dw7 * dw7;
      if (attn7 > 0.0) {
        attn7 = attn7 * attn7;
        value =
          value +
          attn7 * attn7 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx7, dy7, dz7, dw7);
      }

      // Contribution (0,1,1,0)
      dx8 = dx0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy8 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz8 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw8 = dw0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn8 = 2.0 - dx8 * dx8 - dy8 * dy8 - dz8 * dz8 - dw8 * dw8;
      if (attn8 > 0.0) {
        attn8 = attn8 * attn8;
        value =
          value +
          attn8 * attn8 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx8, dy8, dz8, dw8);
      }

      // Contribution (0,1,0,1)
      dx9 = dx0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy9 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz9 = dz0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw9 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn9 = 2.0 - dx9 * dx9 - dy9 * dy9 - dz9 * dz9 - dw9 * dw9;
      if (attn9 > 0.0) {
        attn9 = attn9 * attn9;
        value =
          value +
          attn9 * attn9 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx9, dy9, dz9, dw9);
      }

      // Contribution (0,0,1,1)
      dx10 = dx0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy10 = dy0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz10 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw10 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn10 = 2.0 - dx10 * dx10 - dy10 * dy10 - dz10 * dz10 - dw10 * dw10;
      if (attn10 > 0.0) {
        attn10 = attn10 * attn10;
        value =
          value +
          attn10 * attn10 * +grad4D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 1) | 0, dx10, dy10, dz10, dw10);
      }
    } else {
      // We're inside the second dispentachoron (Rectified 4-Simplex)
      aScore;
      aPoint;
      aIsBiggerSide = 1;
      bScore;
      bPoint;
      bIsBiggerSide = 1;

      // Decide between (0,0,1,1) and (1,1,0,0)
      if (xins + yins < zins + wins) {
        aScore = xins + yins;
        aPoint = 0x0c;
      } else {
        aScore = zins + wins;
        aPoint = 0x03;
      }

      // Decide between (0,1,0,1) and (1,0,1,0)
      if (xins + zins < yins + wins) {
        bScore = xins + zins;
        bPoint = 0x0a;
      } else {
        bScore = yins + wins;
        bPoint = 0x05;
      }

      // Closer between (0,1,1,0) and (1,0,0,1) will replace the further of a and b, if closer.
      if (xins + wins < yins + zins) {
        score = xins + wins;
        if ((aScore <= bScore) & (score < bScore)) {
          bScore = score;
          bPoint = 0x06;
        } else if ((aScore > bScore) & (score < aScore)) {
          aScore = score;
          aPoint = 0x06;
        }
      } else {
        score = yins + zins;
        if ((aScore <= bScore) & (score < bScore)) {
          bScore = score;
          bPoint = 0x09;
        } else if ((aScore > bScore) & (score < aScore)) {
          aScore = score;
          aPoint = 0x09;
        }
      }

      // Decide if (0,1,1,1) is closer.
      p1 = 3.0 - inSum + xins;
      if ((aScore <= bScore) & (p1 < bScore)) {
        bScore = p1;
        bPoint = 0x0e;
        bIsBiggerSide = 0;
      } else if ((aScore > bScore) & (p1 < aScore)) {
        aScore = p1;
        aPoint = 0x0e;
        aIsBiggerSide = 0;
      }

      // Decide if (1,0,1,1) is closer.
      p2 = 3.0 - inSum + yins;
      if ((aScore <= bScore) & (p2 < bScore)) {
        bScore = p2;
        bPoint = 0x0d;
        bIsBiggerSide = 0;
      } else if ((aScore > bScore) & (p2 < aScore)) {
        aScore = p2;
        aPoint = 0x0d;
        aIsBiggerSide = 0;
      }

      // Decide if (1,1,0,1) is closer.
      p3 = 3.0 - inSum + zins;
      if ((aScore <= bScore) & (p3 < bScore)) {
        bScore = p3;
        bPoint = 0x0b;
        bIsBiggerSide = 0;
      } else if ((aScore > bScore) & (p3 < aScore)) {
        aScore = p3;
        aPoint = 0x0b;
        aIsBiggerSide = 0;
      }

      // Decide if (1,1,1,0) is closer.
      p4 = 3.0 - inSum + wins;
      if ((aScore <= bScore) & (p4 < bScore)) {
        bScore = p4;
        bPoint = 0x07;
        bIsBiggerSide = 0;
      } else if ((aScore > bScore) & (p4 < aScore)) {
        aScore = p4;
        aPoint = 0x07;
        aIsBiggerSide = 0;
      }

      // Where each of the two closest points are determines how the extra three vertices are calculated.
      if ((aIsBiggerSide | 0) == (bIsBiggerSide | 0)) {
        if (aIsBiggerSide) {
          // Both closest points on the bigger side
          c1 = aPoint & bPoint & 0xff;
          c2 = (aPoint | bPoint) & 0xff;

          // Two contributions are permutations of (0,0,0,1) and (0,0,0,2) based on c1
          xsv_ext0 = xsv_ext1 = xsb;
          ysv_ext0 = ysv_ext1 = ysb;
          zsv_ext0 = zsv_ext1 = zsb;
          wsv_ext0 = wsv_ext1 = wsb;
          dx_ext0 = dx0 - +heapF64[squishConstant4D >> 3];
          dy_ext0 = dy0 - +heapF64[squishConstant4D >> 3];
          dz_ext0 = dz0 - +heapF64[squishConstant4D >> 3];
          dw_ext0 = dw0 - +heapF64[squishConstant4D >> 3];
          dx_ext1 = dx0 - 2.0 * heapF64[squishConstant4D >> 3];
          dy_ext1 = dy0 - 2.0 * heapF64[squishConstant4D >> 3];
          dz_ext1 = dz0 - 2.0 * heapF64[squishConstant4D >> 3];
          dw_ext1 = dw0 - 2.0 * heapF64[squishConstant4D >> 3];
          if ((c1 & 0x01) != 0) {
            xsv_ext0 = (xsv_ext0 + 1) | 0;
            dx_ext0 = dx_ext0 - 1.0;
            xsv_ext1 = (xsv_ext1 + 2) | 0;
            dx_ext1 = dx_ext1 - 2.0;
          } else if ((c1 & 0x02) != 0) {
            ysv_ext0 = (ysv_ext0 + 1) | 0;
            dy_ext0 = dy_ext0 - 1.0;
            ysv_ext1 = (ysv_ext1 + 2) | 0;
            dy_ext1 = dy_ext1 - 2.0;
          } else if ((c1 & 0x04) != 0) {
            zsv_ext0 = (zsv_ext0 + 1) | 0;
            dz_ext0 = dz_ext0 - 1.0;
            zsv_ext1 = (zsv_ext1 + 2) | 0;
            dz_ext1 = dz_ext1 - 2.0;
          } else {
            wsv_ext0 = (wsv_ext0 + 1) | 0;
            dw_ext0 = dw_ext0 - 1.0;
            wsv_ext1 = (wsv_ext1 + 2) | 0;
            dw_ext1 = dw_ext1 - 2.0;
          }

          // One contribution is a permutation of (1,1,1,-1) based on c2
          xsv_ext2 = (xsb + 1) | 0;
          ysv_ext2 = (ysb + 1) | 0;
          zsv_ext2 = (zsb + 1) | 0;
          wsv_ext2 = (wsb + 1) | 0;
          dx_ext2 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dy_ext2 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dz_ext2 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          dw_ext2 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
          if ((c2 & 0x01) == 0) {
            xsv_ext2 = (xsv_ext2 - 2) | 0;
            dx_ext2 = dx_ext2 + 2.0;
          } else if ((c2 & 0x02) == 0) {
            ysv_ext2 = (ysv_ext2 - 2) | 0;
            dy_ext2 = dy_ext2 + 2.0;
          } else if ((c2 & 0x04) == 0) {
            zsv_ext2 = (zsv_ext2 - 2) | 0;
            dz_ext2 = dz_ext2 + 2.0;
          } else {
            wsv_ext2 = (wsv_ext2 - 2) | 0;
            dw_ext2 = dw_ext2 + 2.0;
          }
        } else {
          // Both closest points on the smaller side
          // One of the two extra points is (1,1,1,1)
          xsv_ext2 = (xsb + 1) | 0;
          ysv_ext2 = (ysb + 1) | 0;
          zsv_ext2 = (zsb + 1) | 0;
          wsv_ext2 = (wsb + 1) | 0;
          dx_ext2 = dx0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
          dy_ext2 = dy0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
          dz_ext2 = dz0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];
          dw_ext2 = dw0 - 1.0 - 4.0 * heapF64[squishConstant4D >> 3];

          // Other two points are based on the shared axes.
          c = aPoint & bPoint & 0xff;

          if ((c & 0x01) != 0) {
            xsv_ext0 = (xsb + 2) | 0;
            xsv_ext1 = (xsb + 1) | 0;
            dx_ext0 = dx0 - 2.0 - 3.0 * heapF64[squishConstant4D >> 3];
            dx_ext1 = dx0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
          } else {
            xsv_ext0 = xsv_ext1 = xsb;
            dx_ext0 = dx_ext1 = dx0 - 3.0 * heapF64[squishConstant4D >> 3];
          }

          if ((c & 0x02) != 0) {
            ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
            dy_ext0 = dy_ext1 = dy0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
            if ((c & 0x01) == 0) {
              ysv_ext0 = (ysv_ext0 + 1) | 0;
              dy_ext0 = dy_ext0 - 1.0;
            } else {
              ysv_ext1 = (ysv_ext1 + 1) | 0;
              dy_ext1 = dy_ext1 - 1.0;
            }
          } else {
            ysv_ext0 = ysv_ext1 = ysb;
            dy_ext0 = dy_ext1 = dy0 - 3.0 * heapF64[squishConstant4D >> 3];
          }

          if ((c & 0x04) != 0) {
            zsv_ext0 = zsv_ext1 = (zsb + 1) | 0;
            dz_ext0 = dz_ext1 = dz0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
            if ((c & 0x03) == 0) {
              zsv_ext0 = (zsv_ext0 + 1) | 0;
              dz_ext0 = dz_ext0 - 1.0;
            } else {
              zsv_ext1 = (zsv_ext1 + 1) | 0;
              dz_ext1 = dz_ext1 - 1.0;
            }
          } else {
            zsv_ext0 = zsv_ext1 = zsb;
            dz_ext0 = dz_ext1 = dz0 - 3.0 * heapF64[squishConstant4D >> 3];
          }

          if ((c & 0x08) != 0) {
            wsv_ext0 = (wsb + 1) | 0;
            wsv_ext1 = (wsb + 2) | 0;
            dw_ext0 = dw0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
            dw_ext1 = dw0 - 2.0 - 3.0 * heapF64[squishConstant4D >> 3];
          } else {
            wsv_ext0 = wsv_ext1 = wsb;
            dw_ext0 = dw_ext1 = dw0 - 3.0 * heapF64[squishConstant4D >> 3];
          }
        }
      } else {
        // One point on each "side"
        c1, c2;
        if (aIsBiggerSide) {
          c1 = aPoint;
          c2 = bPoint;
        } else {
          c1 = bPoint;
          c2 = aPoint;
        }

        // Two contributions are the bigger-sided point with each 1 replaced with 2.
        if ((c1 & 0x01) != 0) {
          xsv_ext0 = (xsb + 2) | 0;
          xsv_ext1 = (xsb + 1) | 0;
          dx_ext0 = dx0 - 2.0 - 3.0 * heapF64[squishConstant4D >> 3];
          dx_ext1 = dx0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
        } else {
          xsv_ext0 = xsv_ext1 = xsb;
          dx_ext0 = dx_ext1 = dx0 - 3.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c1 & 0x02) != 0) {
          ysv_ext0 = ysv_ext1 = (ysb + 1) | 0;
          dy_ext0 = dy_ext1 = dy0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
          if ((c1 & 0x01) == 0) {
            ysv_ext0 = (ysv_ext0 + 1) | 0;
            dy_ext0 = dy_ext0 - 1.0;
          } else {
            ysv_ext1 = (ysv_ext1 + 1) | 0;
            dy_ext1 = dy_ext1 - 1.0;
          }
        } else {
          ysv_ext0 = ysv_ext1 = ysb;
          dy_ext0 = dy_ext1 = dy0 - 3.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c1 & 0x04) != 0) {
          zsv_ext0 = zsv_ext1 = (zsb + 1) | 0;
          dz_ext0 = dz_ext1 = dz0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
          if ((c1 & 0x03) == 0) {
            zsv_ext0 = (zsv_ext0 + 1) | 0;
            dz_ext0 = dz_ext0 - 1.0;
          } else {
            zsv_ext1 = (zsv_ext1 + 1) | 0;
            dz_ext1 = dz_ext1 - 1.0;
          }
        } else {
          zsv_ext0 = zsv_ext1 = zsb;
          dz_ext0 = dz_ext1 = dz0 - 3.0 * heapF64[squishConstant4D >> 3];
        }

        if ((c1 & 0x08) != 0) {
          wsv_ext0 = (wsb + 1) | 0;
          wsv_ext1 = (wsb + 2) | 0;
          dw_ext0 = dw0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
          dw_ext1 = dw0 - 2.0 - 3.0 * heapF64[squishConstant4D >> 3];
        } else {
          wsv_ext0 = wsv_ext1 = wsb;
          dw_ext0 = dw_ext1 = dw0 - 3.0 * heapF64[squishConstant4D >> 3];
        }

        // One contribution is a permutation of (1,1,1,-1) based on the smaller-sided point
        xsv_ext2 = (xsb + 1) | 0;
        ysv_ext2 = (ysb + 1) | 0;
        zsv_ext2 = (zsb + 1) | 0;
        wsv_ext2 = (wsb + 1) | 0;
        dx_ext2 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
        dy_ext2 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
        dz_ext2 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
        dw_ext2 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
        if ((c2 & 0x01) == 0) {
          xsv_ext2 = (xsv_ext2 - 2) | 0;
          dx_ext2 = dx_ext2 + 2.0;
        } else if ((c2 & 0x02) == 0) {
          ysv_ext2 = (ysv_ext2 - 2) | 0;
          dy_ext2 = dy_ext2 + 2.0;
        } else if ((c2 & 0x04) == 0) {
          zsv_ext2 = (zsv_ext2 - 2) | 0;
          dz_ext2 = dz_ext2 + 2.0;
        } else {
          wsv_ext2 = (wsv_ext2 - 2) | 0;
          dw_ext2 = dw_ext2 + 2.0;
        }
      }

      // Contribution (1,1,1,0)
      dx4 = dx0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      dy4 = dy0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      dz4 = dz0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      dw4 = dw0 - 3.0 * heapF64[squishConstant4D >> 3];
      attn4 = 2.0 - dx4 * dx4 - dy4 * dy4 - dz4 * dz4 - dw4 * dw4;
      if (attn4 > 0.0) {
        attn4 = attn4 * attn4;
        value =
          value +
          attn4 * attn4 * +grad4D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx4, dy4, dz4, dw4);
      }

      // Contribution (1,1,0,1)
      dx3 = dx4;
      dy3 = dy4;
      dz3 = dz0 - 3.0 * heapF64[squishConstant4D >> 3];
      dw3 = dw0 - 1.0 - 3.0 * heapF64[squishConstant4D >> 3];
      attn3 = 2.0 - dx3 * dx3 - dy3 * dy3 - dz3 * dz3 - dw3 * dw3;
      if (attn3 > 0.0) {
        attn3 = attn3 * attn3;
        value =
          value +
          attn3 * attn3 * +grad4D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx3, dy3, dz3, dw3);
      }

      // Contribution (1,0,1,1)
      dx2 = dx4;
      dy2 = dy0 - 3.0 * heapF64[squishConstant4D >> 3];
      dz2 = dz4;
      dw2 = dw3;
      attn2 = 2.0 - dx2 * dx2 - dy2 * dy2 - dz2 * dz2 - dw2 * dw2;
      if (attn2 > 0.0) {
        attn2 = attn2 * attn2;
        value =
          value +
          attn2 * attn2 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 1) | 0, dx2, dy2, dz2, dw2);
      }

      // Contribution (0,1,1,1)
      dx1 = dx0 - 3.0 * heapF64[squishConstant4D >> 3];
      dz1 = dz4;
      dy1 = dy4;
      dw1 = dw3;
      attn1 = 2.0 - dx1 * dx1 - dy1 * dy1 - dz1 * dz1 - dw1 * dw1;
      if (attn1 > 0.0) {
        attn1 = attn1 * attn1;
        value =
          value +
          attn1 * attn1 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, (wsb + 1) | 0, dx1, dy1, dz1, dw1);
      }

      // Contribution (1,1,0,0)
      dx5 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy5 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz5 = dz0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw5 = dw0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn5 = 2.0 - dx5 * dx5 - dy5 * dy5 - dz5 * dz5 - dw5 * dw5;
      if (attn5 > 0.0) {
        attn5 = attn5 * attn5;
        value =
          value +
          attn5 * attn5 * +grad4D((xsb + 1) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 0) | 0, dx5, dy5, dz5, dw5);
      }

      // Contribution (1,0,1,0)
      dx6 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy6 = dy0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz6 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw6 = dw0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn6 = 2.0 - dx6 * dx6 - dy6 * dy6 - dz6 * dz6 - dw6 * dw6;
      if (attn6 > 0.0) {
        attn6 = attn6 * attn6;
        value =
          value +
          attn6 * attn6 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx6, dy6, dz6, dw6);
      }

      // Contribution (1,0,0,1)
      dx7 = dx0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy7 = dy0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz7 = dz0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw7 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn7 = 2.0 - dx7 * dx7 - dy7 * dy7 - dz7 * dz7 - dw7 * dw7;
      if (attn7 > 0.0) {
        attn7 = attn7 * attn7;
        value =
          value +
          attn7 * attn7 * +grad4D((xsb + 1) | 0, (ysb + 0) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx7, dy7, dz7, dw7);
      }

      // Contribution (0,1,1,0)
      dx8 = dx0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy8 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz8 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw8 = dw0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn8 = 2.0 - dx8 * dx8 - dy8 * dy8 - dz8 * dz8 - dw8 * dw8;
      if (attn8 > 0.0) {
        attn8 = attn8 * attn8;
        value =
          value +
          attn8 * attn8 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 1) | 0, (wsb + 0) | 0, dx8, dy8, dz8, dw8);
      }

      // Contribution (0,1,0,1)
      dx9 = dx0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy9 = dy0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz9 = dz0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw9 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn9 = 2.0 - dx9 * dx9 - dy9 * dy9 - dz9 * dz9 - dw9 * dw9;
      if (attn9 > 0.0) {
        attn9 = attn9 * attn9;
        value =
          value +
          attn9 * attn9 * +grad4D((xsb + 0) | 0, (ysb + 1) | 0, (zsb + 0) | 0, (wsb + 1) | 0, dx9, dy9, dz9, dw9);
      }

      // Contribution (0,0,1,1)
      dx10 = dx0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dy10 = dy0 - 0.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dz10 = dz0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      dw10 = dw0 - 1.0 - 2.0 * heapF64[squishConstant4D >> 3];
      attn10 = 2.0 - dx10 * dx10 - dy10 * dy10 - dz10 * dz10 - dw10 * dw10;
      if (attn10 > 0.0) {
        attn10 = attn10 * attn10;
        value =
          value +
          attn10 * attn10 * +grad4D((xsb + 0) | 0, (ysb + 0) | 0, (zsb + 1) | 0, (wsb + 1) | 0, dx10, dy10, dz10, dw10);
      }
    }

    // First extra vertex
    attn_ext0 = 2.0 - dx_ext0 * dx_ext0 - dy_ext0 * dy_ext0 - dz_ext0 * dz_ext0 - dw_ext0 * dw_ext0;
    if (attn_ext0 > 0.0) {
      attn_ext0 = attn_ext0 * attn_ext0;
      value =
        value +
        attn_ext0 * attn_ext0 * +grad4D(xsv_ext0, ysv_ext0, zsv_ext0, wsv_ext0, dx_ext0, dy_ext0, dz_ext0, dw_ext0);
    }

    // Second extra vertex
    attn_ext1 = 2.0 - dx_ext1 * dx_ext1 - dy_ext1 * dy_ext1 - dz_ext1 * dz_ext1 - dw_ext1 * dw_ext1;
    if (attn_ext1 > 0.0) {
      attn_ext1 = attn_ext1 * attn_ext1;
      value =
        value +
        attn_ext1 * attn_ext1 * +grad4D(xsv_ext1, ysv_ext1, zsv_ext1, wsv_ext1, dx_ext1, dy_ext1, dz_ext1, dw_ext1);
    }

    // Third extra vertex
    attn_ext2 = 2.0 - dx_ext2 * dx_ext2 - dy_ext2 * dy_ext2 - dz_ext2 * dz_ext2 - dw_ext2 * dw_ext2;
    if (attn_ext2 > 0.0) {
      attn_ext2 = attn_ext2 * attn_ext2;
      value =
        value +
        attn_ext2 * attn_ext2 * +grad4D(xsv_ext2, ysv_ext2, zsv_ext2, wsv_ext2, dx_ext2, dy_ext2, dz_ext2, dw_ext2);
    }

    return +normalize(value);
  }

  return {
    setSeed: setSeed,
    noise2D: noise2D,
    noise3D: noise3D,
    noise4D: noise4D,
  };
}

const heap = new ArrayBuffer(0x100000);

// set constants
{
  const heapF64 = new Float64Array(heap, 0x800 * 2);
  heapF64[0 + 0] = (1 / Math.sqrt(2 + 1) - 1) / 2; // stretch constant 2d
  heapF64[3 + 0] = (Math.sqrt(2 + 1) - 1) / 2; // squish constant 2d
  heapF64[0 + 1] = (1 / Math.sqrt(3 + 1) - 1) / 3; // stretch constant 3d
  heapF64[3 + 1] = (Math.sqrt(3 + 1) - 1) / 3; // squish constant 3d
  heapF64[0 + 2] = (1 / Math.sqrt(4 + 1) - 1) / 4; // stretch constant 4d
  heapF64[3 + 2] = (Math.sqrt(4 + 1) - 1) / 4; // squish constant 4d
}

// create gradients
{
  const heapF64 = new Float64Array(heap, 0x800 * 2 + 6 * 0x8);

  let offset = 0;
  {
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

    for (let i = 0; i < 2 * 0x800; i++) {
      heapF64[offset + i] = gradients2D[i % gradients2D.length];
    }
    offset += 2 * 0x800;
  }

  {
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
      1.6667938651159684,  -0.24732126143473554,  2.838945207362466,
    ].map((n) => n / 26.92263139946168);

    for (let i = 0; i < 3 * 0x800; i++) {
      heapF64[offset + i] = gradients3D[i % gradients3D.length];
    }
    offset += 3 * 0x800;
  }

  {
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

    for (let i = 0; i < 4 * 0x800; i++) {
      heapF64[offset + i] = gradients4D[i % gradients4D.length];
    }
  }
}

const { setSeed, noise2D, noise3D, noise4D } = OpenSimplexUnoptimized(
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
  noise2D,
  noise3D,
  noise4D,
};
