import logger from '../helpers/logger';

const isWorker = !!process.env.WORKER;

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const jobOpts = {
  timeout: 30 * MINUTES,
  attempts: 100,
  removeOnComplete: true,
  backoff: { type: 'fixed', delay: 10000 },
};

const queues = [];

const processor = (queue, name) => {
  if (isWorker) {
    queue.on('error', (error) => {
      logger.error(`${queue.name} job threw error: ${JSON.stringify(error)}`);
    });

    queue.on('active', (job) => {
      logger.info(`${queue.name} ${job.id} started processing.`);
    });
    queue.on('progress', (job, progress) => {
      logger.info(
        `${queue.name} ${job.id} job indicated progress: ${progress}`,
      );
    });
    queue.on('completed', (job) => {
      logger.info(`${queue.name} ${job.id} job complete.`);
    });
    queue.on('failed', (job, error) => {
      logger.warn(`${queue.name} - ${job.name} - ${job.id} - failed:`, error);
    });
    queue.on('stalled', (job) => {
      logger.info(`${queue.name} ${job.id} stalled.`);
    });

    queue.on('cleaned', (jobs, type) => {
      logger.info(`${queue.name} cleaned ${type} ${jobs.length}.`);
    });
    queue.on('paused', () => {
      logger.info(`${queue.name} queue paused.`);
    });
    queue.on('resumed', () => {
      logger.info(`${queue.name} queue resumed.`);
    });
    queues.push(queue);

    logger.info(`${name} event handlers attached.`);
    return queue;
  }

  return { process: () => {} };
};

export { processor, jobOpts };
