import { assert } from 'chai';
// also test some imports
import chorpilerAlgo from '../src/index';

describe('NPM Package', () => {
  it('should be an object', () => {
    assert.isObject(chorpilerAlgo);
  });

  it('should have Parser, generators, and utils property', () => {
    assert.property(chorpilerAlgo, 'generators');
  });

  describe('generators', () => {
    it('should have teal property', () => {
      const gens = chorpilerAlgo.generators;
      assert.property(gens, 'teal');
      assert.property(gens.teal, 'DefaultContractGenerator');
    });

    it('should conform to template engine interface', () => {
      assert.isFunction(new chorpilerAlgo.generators.teal.DefaultContractGenerator().compile)
    });
  });
});