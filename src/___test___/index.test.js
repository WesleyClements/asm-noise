const noise = require('../../dist/asm-noise');

describe('noise', () => {
  const getTypesExcept = (type) => [undefined, null, true, 1, 1n, Symbol(), {}, () => {}].filter(value => typeof value !== type);

  const getRandomNumber = () => (2*Math.random() - 1) * Number.MAX_SAFE_INTEGER;

  it('should export a function', () => {
    expect(typeof noise).toBe('function');
  });
  
  it('should return a number when given 2 arguments', () => {
    noise.algorithms.forEach((algorithm) => {
      noise.algorithm = algorithm;
      Array(100).fill().forEach(() => {
        expect(noise(getRandomNumber(), getRandomNumber())).toEqual(expect.any(Number));
      });
    });
  });
  
  it('should return a number when given 3 arguments', () => {
    noise.algorithms.forEach((algorithm) => {
      noise.algorithm = algorithm;
      Array(100).fill().forEach(() => {
        expect(noise(getRandomNumber(), getRandomNumber(), getRandomNumber())).toEqual(expect.any(Number));
      });
    });
  });
  
  it('should return a number when given 4 arguments', () => {
    noise.algorithms.forEach((algorithm) => {
      noise.algorithm = algorithm;
      Array(100).fill().forEach(() => {
        expect(noise(getRandomNumber(), getRandomNumber(), getRandomNumber(), getRandomNumber())).toEqual(expect.any(Number));
      });
    });
  });

  describe('algorithm', () => {
    it('should be a property of noise', () => {
      expect(noise.algorithm).toEqual(expect.any(String));
    });
    it('throws a TypeError when set to a type other than string', () => {
      getTypesExcept('string').forEach(invalidType => {
        expect(() => noise.algorithm = invalidType).toThrow(TypeError);
        expect(noise.algorithm).not.toBe(invalidType);
      });
    });
    it('throws a Error when set to an invalid algorithm', () => {
      ['cat', 'dog'].forEach((invalidAlgorithm) => {
        expect(() => noise.algorithm = invalidAlgorithm).toThrow(Error);
        expect(noise.algorithm).not.toBe(invalidAlgorithm);
      });
    });
    it('can be set to any valid algorithm', () => {
      noise.algorithms.forEach((validAlgorithm) => {
        expect(() => noise.algorithm = validAlgorithm).not.toThrow();
        expect(noise.algorithm).toBe(validAlgorithm);
      });
    });
  });
  describe('seed', () => {
    it('should be a property of noise', () => {
      expect(noise.seed).toEqual(expect.any(Number));
    });
    it('gets set to a number', () => {
      Array(100).fill(() => getRandomNumber())
        .map(generator => generator())
        .forEach(seed => {
          noise.seed = seed;
          expect(noise.seed).toBe(seed);
        });
    });
  });
  ['octaves', 'lacunarity', 'persistence'].forEach((prop) => {
    describe(prop, () => {
      it('should be a property of noise', () => {
        expect(noise[prop]).toEqual(expect.any(Number));
      });
      it;
      it('throws a TypeError when set to a type other than number', () => {
        getTypesExcept('number').forEach(invalidType => {
          expect(() => noise[prop] = invalidType).toThrow(TypeError);
          expect(noise[prop]).not.toBe(invalidType);
        });
      });
      it('throws a RangeError when set to NaN', () => {
        expect(() => noise[prop] = NaN).toThrow(RangeError);
        expect(noise[prop]).not.toBeNaN();
      });
    });
  });

  describe('octaves', () => {{
    it('throws a RangeError when set to a number that is not an integer', () => {
      Array(100).fill(() => getRandomNumber())
        .map(generator => generator())
        .filter(num => !Number.isInteger(num))
        .forEach((num) => {
          expect(() => noise.octaves = num).toThrow(RangeError);
          expect(noise.octaves).not.toBe(num);
        });
    });
    it('throws a RangeError when set to a number less than 1', () => {
      Array(100).fill(() => 1 - Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
        .map(generator => generator())
        .forEach((num) => {
          expect(() => noise.octaves = num).toThrow(RangeError);
          expect(noise.octaves).not.toBe(num);
        });
    });
  }});

  describe('lacunarity', () => {{
    it('throws a RangeError when set to 0', () => {
      expect(() => noise.octaves = 0).toThrow(RangeError);
      expect(noise.octaves).not.toBe(0);
    });
  }});

  describe('persistence', () => {{
    it('throws a RangeError when set to 0', () => {
      expect(() => noise.octaves = 0).toThrow(RangeError);
      expect(noise.octaves).not.toBe(0);
    });
  }});
});