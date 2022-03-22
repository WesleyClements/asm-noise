import perlin from './perlin.mjs';
import openSimplexUnoptimized from './openSimplexUnoptimized.mjs';

export const defaultAlgorithm = 'open-simplex';

export default {
  perlin,
  'open-simplex': openSimplexUnoptimized,
};