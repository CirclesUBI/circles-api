import logger from '../helpers/logger';

export default function processor(queue) {
  queue.on('error', (error) => {
    logger.error(`"${queue.name}" job threw error: ${error}`);
  });

  queue.on('active', (job) => {
    logger.info(`"${queue.name}" job with id ${job.id} started processing`);
  });

  queue.on('progress', (job, progress) => {
    logger.info(
      `"${queue.name}" job with id ${job.id} indicated progress: ${progress}`,
    );
  });

  queue.on('completed', (job) => {
    logger.info(`"${queue.name}" job with id "${job.id}" completed`);
  });

  queue.on('failed', (job, error) => {
    logger.warn(`"${queue.name}" - ${job.name} - ${job.id} - failed: ${error}`);
  });

  queue.on('stalled', (job) => {
    logger.info(`"${queue.name}" with id "${job.id}" stalled`);
  });

  queue.on('cleaned', (jobs, type) => {
    logger.info(`"${queue.name}" cleaned ${type} ${jobs.length}`);
  });

  queue.on('paused', () => {
    logger.info(`"${queue.name}" queue paused`);
  });

  queue.on('resumed', () => {
    logger.info(`"${queue.name}" queue resumed`);
  });

  logger.info(`"${queue.name}" event handlers attached`);

  return queue;
}
