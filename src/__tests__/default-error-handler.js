import { defaultErrorHandler } from '../acall';

describe('defaultErrorHandler', () => {
  let _storedConsoleError;

  beforeAll(() => {
    _storedConsoleError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = _storedConsoleError;
  });

  it('should call console.error', () => {
    const err = new Error('oh no');
    defaultErrorHandler(err);

    expect(console.error).toBeCalledWith(err);
  });
});
