import acall from '../acall';

describe('acall', () => {
  it('should be a function', () => {
    expect(acall).toBeInstanceOf(Function);
  });

  describe('with a function for value', () => {
    it('should call valueFn', async () => {
      const valueFn = jest.fn();
      await acall(valueFn);

      expect(valueFn).toBeCalled();
    });

    it('should return value from valueFn', async () => {
      const valueFn = jest.fn(() => 123);
      const result = await acall(valueFn);

      expect(result).toBe(123);
    });

    it('should throw error synchronously if valueFn throws an error', () => {
      const err = new Error('oh noes');
      const valueFn = jest.fn(() => {
        throw err;
      });

      expect(() => acall(valueFn)).toThrow(err);
    });
  });

  describe('with an asynchronous function for value', () => {
    it('should call asyncValueFn', async () => {
      const asyncValueFn = jest.fn(async () => {});
      await acall(asyncValueFn);

      expect(asyncValueFn).toBeCalled();
    });

    it('should return a Promise that resolves to return value of asyncValueFn', () => {
      const asyncValueFn = jest.fn(async () => 123);

      expect(acall(asyncValueFn)).resolves.toBe(123);
    });

    it('should call errorHandler if asyncValueFn rejects with an error', async () => {
      const err = new Error('oh noes');
      const handler = jest.fn();
      await acall(async () => {
        throw err;
      }, handler);

      expect(handler).toBeCalledWith(err);
    });
  });

  describe('with a Promise', () => {
    it('should return the resolved value if Promise is resolved', () => {
      const promise = Promise.resolve('ok');

      expect(acall(promise)).resolves.toBe('ok');
    });

    it('should call errorHandler if Promise is rejected', async () => {
      const err = new Error('oh noes');
      const handler = jest.fn();
      const promise = Promise.reject(err);

      await acall(promise, handler);

      expect(handler).toBeCalledWith(err);
    });
  });

  describe('with a value', () => {
    it('should resolve with undefined if value is undefined', async () => {
      const value = undefined;
      expect(await acall(value)).toBe(value);
    });

    it('should resolve with null if value is null', async () => {
      const value = null;
      expect(await acall(value)).toBe(value);
    });

    it('should resolve with empty string if value is empty string', async () => {
      const value = '';
      expect(await acall(value)).toBe(value);
    });

    it('should resolve with NaN if value is NaN', async () => {
      const value = NaN;
      expect(await acall(value)).toBe(value);
    });

    it('should resolve with number if value is number', async () => {
      const value = 123;
      expect(await acall(value)).toBe(value);
    });

    it('should resolve with string if value is string', async () => {
      const value = 'foo';
      expect(await acall(value)).toBe(value);
    });

    it('should resolve with symbol if value is symbol', async () => {
      const value = Symbol('TEST');
      expect(await acall(value)).toBe(value);
    });
  });
});
