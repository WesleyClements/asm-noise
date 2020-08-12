const heap = new BigInt64Array(2);
const seed = 0;
const current = 1;

function nextBigInt64() {
  heap[current] = heap[current] * 6364136223846793005n + 1442695040888963407n;
  return heap[current];
}

function nextBigUint64() {
  return BigInt.asUintN(64, nextBigInt64());
}

function nextInt8() {
  return Number(BigInt.asIntN(8, nextBigInt64()));
}
function nextUint8() {
  return Number(BigInt.asUintN(8, nextBigInt64()));
}

function nextInt16() {
  return Number(BigInt.asIntN(16, nextBigInt64()));
}
function nextUint16() {
  return Number(BigInt.asUintN(16, nextBigInt64()));
}

function nextInt32() {
  return Number(BigInt.asIntN(32, nextBigInt64()));
}

function nextUint32() {
  return Number(BigInt.asUintN(32, nextBigInt64()));
}

function next() {
  return nextUint32() / 0xffffffff;
}

function nextGaussian() {
  return Math.sqrt(-2.0 * Math.log(next())) * Math.cos(2.0 * Math.PI * next());
}

function nextBool() {
  return (nextBigInt64() & 0x1n) === 0n;
}

export default {
  set seed(value) {
    if (typeof value !== 'bigint') value = BigInt(value);
    heap[seed] = value;
    heap[current] = value;
  },
  get seed() {
    return heap[seed];
  },
  nextInt8,
  nextUint8,
  nextInt16,
  nextUint16,
  nextInt32,
  nextUint32,
  nextBigInt64,
  nextBigUint64,
  next,
  nextGaussian,
  nextBool,
};
