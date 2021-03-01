import perlin from "./perlin";
import openSimplexUnoptimized from "./openSimplexUnoptimized";

export const defaultAlgorithm = "open-simplex";

export default {
  perlin,
  "open-simplex": openSimplexUnoptimized,
};