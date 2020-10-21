import logger from '../helpers/logger';
import { jobOpts } from './processor';

const submitJob = (queue, id, data) => {
  return queue.getJob(id).then((job) => {
    if (job) {
      logger.warn(`job ${queue.name} for ${id} is already running`);
      return true;
    }
    logger.info(`Adding job ${queue.name} for ${id}`);
    return queue.add({ id, ...data }, { jobId: id, ...jobOpts });
  });
};

export default submitJob;
