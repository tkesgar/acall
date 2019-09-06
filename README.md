# acall

> Utility function to avoid UnhandledPromiseRejection

`acall` wraps an asynchronous function or Promise to redirect rejections to a
specified error handling function.

I ended up using `acall` in a lot of places for my work, so I decided to move it
into a package.

## Motivation

`async`/`await` is probably The Greatest Big Thing™ ever happened with
JavaScript; there are so many tutorials on this out there. At last, programmers
can express asynchronous codes just like how we already used to with procedural,
sequential code:

```js
async function doSomethingAsync() {
  await doSomething();

  const result = shouldDoThat ? await doThat() : null;
  if (result) {
    await doSomethingElse();
  }
}
```

There is a catch, though: `await` can only exists inside `async`, and we have to
call the `async` function somewhere in our sequential code:

```js
// This code won't work and the linter will scream at you
async function asyncFn() {
  // do something
}

function nonAsyncFn() {
  await asyncFunction()
}
```

Some people just get away by doing this:

```js
async function asyncFn() {
  // do something
}

function nonAsyncFn() {
  asyncFn();
}
```

**This is dangerous and should be avoided.** The problem is that the execution
of `asyncFn` is done in a different sequence (think of threads, [except not
really][1]), and if that `asyncFn` throws an error, nothing can handle that
error.

Here is another example. Imagine if you do this in your browser code:

```js
async function sendCheckout() {
  await fetchAPI({ product: checkoutThings, userInfo: await getUserInfo() });
  showNotification('success');
}

// This function gets attached to a button/React onClick/Vue @click
function onButtonCheckoutClick() {
  sendCheckout();
}
```

In the example above, **if `fetchAPI` throws an error then nothing can handle
that error**. Visually nothing will happen, but a `PromiseRejectionEvent` will
show up in the console.

Here is another example with Express:

```js
async function handleCheckout(checkoutData) {
  await storeCheckoutData(checkoutData);
}

app.use((req, res, next) => {
  handleCheckout(req.body);
  res.sendStatus(200);
});
```

If `storeCheckoutData(checkoutData)` throws an error, the returned response is
still `HTTP 200` as usual, but an ugly `UnhandledPromiseRejectionWarning` will
pop up on log:

```
(node:10047) UnhandledPromiseRejectionWarning: DatabaseError: connection failed
    <stack trace>
(node:10047) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). (rejection id: 1)
(node:10047) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
```

The examples might seem contrived, but with large codebases or frameworks with
complex JavaScript-fu, tracking which code does not handle the promise rejection
is really a painful process.

This is where `acall` comes in. You can wrap your async function calls with
`acall` to avoid unhandled promise rejection:

```js
async function sendCheckout() {
  await fetchAPI({ product: checkoutThings, userInfo: await getUserInfo() });
  showNotification('success');
}

// This function gets attached to a button/React onClick/Vue @click
function onButtonCheckoutClick() {
  acall(sendCheckout());
}
```

However, using `acall` just like this is not really that useful. `acall` works
best if you provide an _error handler_:

```js
function showErrorNotification(error) {
  // Show a modal about the error, maybe log error to external service
}

async function sendCheckout() {
  await fetchAPI({ product: checkoutThings, userInfo: await getUserInfo() });
  showNotification('success');
}

// This function gets attached to a button/React onClick/Vue @click
function onButtonCheckoutClick() {
  acall(sendCheckout(), showErrorNotification);
}
```

This way, if `fetchAPI` throws an error -- be it a HTTP request error or you
just forget to send the authentication token -- `showErrorNotification` will
handle that error and show some UI to user, perhaps a modal with message.

There are more recipes on things you can do with `acall` [below](#recipes]). You
might want to check the [Alternatives](#alternatives) section as well, because
there are some cases when you might not need `acall` at all.

## Installation

```bash
$ npm i acall
```

## Usage

```js
import acall from 'acall';

acall(async () => {
  await doSomethingAsync();
});
```

## API

`acall` exports a single function `acall`.

### `acall(value, [errorHandler])`

Given a `value`, perform some actions and returns a `Promise`. The behaviour of
`acall` differs depending on the value:

1. If `value` is a function, `acall` will call `value` without any arguments.
   `acall` will return `acall(value())`.
2. If `value` is a thenable, `acall` will return
   `value.then(undefined, errorHandler)`.
3. Otherwise, `acall` returns `Promise.resolve(value)`.

`errorHandler` is optional, but it is recommended to provide one because every
applications handle errors differently.

- In browser environment: call `alert(error.message)` and
  `console.error(error)`.
- In Node.js environment: call `console.error(error)` _and exits the
  application_.

This behaviour is intentional to encourage users for providing their own error
handling function.

Put it simply, `acall` is just this function (without safety checks and
comments):

```js
function acall(value, errorHandler = defaultErrorHandler) {
  if (typeof value === 'function') {
    return acall(value(), errorHandler);
  }

  if (value.then) {
    return value.then(undefined, errorHandler);
  }

  return Promise.resolve(value);
}
```

## Recipes

With the above rules, there are a number of useful things we can do with
`acall`.

### Performing async tasks at browser event handling

_TBD_

### Using async functions as Express middlewares

_TBD_

### Simple `main()` entry point for Node.js scripts

_TBD_

### Handling a subset of errors

Sometimes you want to handle a subset of errors differently. For example, if the
error is a `HTTPError` you want to print a connection failure message. In that
case, use a `try-catch` block inside `acall` to handle the necessary errors:

```js
function myErrorHandler(error) {
  showNotification('error', 'Something bad happened');
}

const myAcall = (value, handler = myErrorHandler) => acall(value, handler);

myAcall(async () => {
  try {
    await doSomethingAsync();
  } catch (error) {
    if (error instanceof HTTPError) {
      showNotification('error', 'Failed to connect with API server');
      return;
    }

    throw error;
  }
});
```

## Alternatives

Sometimes you do not need `acall`. Basically you do not need to use `acall` if a
mechanism to catch unhandled promise rejection already exists. This means that
you do not need to wrap your asynchronous functions; you can simply `throw`
errors normally.

You can try returning a rejected promise in your code and see if anything
handled the error:

```js
(() => Promise.reject(new Error('uncaught promise rejection')))();
```

### Global unhandled Promise rejection

Some environments provide a mechanism to handle unhandled promise rejection If
you are allowed to use them or someone already handled this for you, you
probably do not need `acall`.

With browsers you can listen for [`unhandledrejection` event][2]:

```js
window.addEventListener('unhandledrejection', (event) => {
  console.warn(`UNHANDLED PROMISE REJECTION: ${event.reason}`);
});
```

With Node.js you can listen for [`uncaughtException` event][3]:

```js
process.on('uncaughtException', (err, origin) => {
  fs.writeSync(
    process.stderr.fd,
    `Caught exception: ${err}\n` + `Exception origin: ${origin}`
  );
});

setTimeout(() => {
  console.log('This will still run.');
}, 500);

// Intentionally cause an exception, but don't catch it.
nonexistentFunc();
console.log('This will not run.');
```

> Please note that `uncaughtException` also catches _synchronous uncaught
> exception_, not only unhandled Promise rejection.

### Native async frameworks (e.g. Koa)

If you use frameworks that already support Promise/`async`, you probably do not
need `acall`. `acall` is intended as an interface to call asynchronous functions
from non-asynchronous code; if your framework already do this, there are no need
to use `acall`.

[Koa](https://koajs.com/), for example, has a built-in error-handling mechanism:

```js
async function doSomething() {
  throw new Error('eep');
}

app.use(async (ctx) => {
  ctx.body = await doSomething();
});

app.on('error', (err, ctx) => {
  log.error('server error', err, ctx);
});
```

## License

Licensed under
[MIT License](https://github.com/tkesgar/acall/blob/master/LICENSE).

[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop
[2]:
  https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
[3]: https://nodejs.org/api/process.html#process_event_uncaughtexception
