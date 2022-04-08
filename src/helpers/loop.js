const LOOP_INTERVAL = 5000;
const MAX_ATTEMPTS = 12;
// Times the method will repeat the request after an error or condition failure
const RETRIES_ON_FAIL_DEFAULT = 3;
// When a request fails wait a few ms before we do it again
const WAIT_AFTER_FAIL_DEFAULT = 5000;
// Error message used to indicate failed condition check
const TRIED_TOO_MANY_TIMES = 'Tried too many times waiting for condition.';

// Helper method to wait for a few milliseconds before we move on
export async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function loop(request, condition) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const interval = setInterval(async () => {
      try {
        const response = await request();
        attempt += 1;

        if (condition(response)) {
          clearInterval(interval);
          resolve(response);
        } else if (attempt > MAX_ATTEMPTS) {
          throw new Error('Too many attempts');
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, LOOP_INTERVAL);
  });
}

// This helper method repeats calling a request when it fails or when a
// condition was not reached after some attempts.
//
// Use this method if you want to make a crucial request for creating or
// updating data somewhere. When this request fails, for example because of
// networking issues or server outage, this helper method will try to repeat
// the request for you until it succeeded.
export async function waitAndRetryOnFail(
  requestFn,
  loopFn,
  {
    maxAttemptsOnFail = RETRIES_ON_FAIL_DEFAULT,
    waitAfterFail = WAIT_AFTER_FAIL_DEFAULT,
  } = {},
) {
  // Count all attempts to retry when something failed
  let attempt = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // Make request and wait for response
      const response = await requestFn();

      // Wait for a few seconds until our condition arrives
      // NOTE: Here we need to apply the condition on the result of the requestFn
      await loopFn(response);

      // Finish when request was successful and condition arrived!
      return response;
    } catch (error) {
      // Something went wrong, either the condition did not arrive or the
      // request failed
      if (attempt >= maxAttemptsOnFail) {
        // We tried too often, propagate error and stop here
        throw error;
      }

      // Wait when request failed to prevent calling the request too fast again
      if (error.message !== TRIED_TOO_MANY_TIMES) {
        await wait(waitAfterFail);
      }

      // Lets try again ..
      attempt += 1;
    }
  }
}