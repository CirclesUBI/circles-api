import logger from './logger';

const LOOP_INTERVAL = 3000;
const MAX_ATTEMPTS = 20;

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
        logger.error(error);
        clearInterval(interval);
        reject(error);
      }
    }, LOOP_INTERVAL);
  });
}
