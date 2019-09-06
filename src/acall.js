export function defaultErrorHandler(error) {
  console.error(error);
}

export default function acall(value, errorHandler = defaultErrorHandler) {
  if (typeof value === 'function') {
    return acall(value(), errorHandler);
  }

  if (value && typeof value.then === 'function') {
    return value.then(undefined, errorHandler);
  }

  return Promise.resolve(value);
}
