const LOOP_INTERVAL = 5000;
const MAX_ATTEMPTS = 12;

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
