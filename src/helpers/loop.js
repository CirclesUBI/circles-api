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

        if (await condition(response)) {
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
