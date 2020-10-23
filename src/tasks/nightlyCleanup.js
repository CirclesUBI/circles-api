import {
  syncFullGraph,
  nightlyCleanup,
  allQueues,
} from '../services/queue';
import { processor, jobOpts } from './processor';
import logger from '../helpers/logger';

const cleanQueues = () => {
  return Promise.all(allQueues.map((queue) => queue.clean(1000, 'completed')));
};

const nightlyRepeatOpts = { cron: '0 * * * * *' }; // midnight UTC

Promise.all([
  nightlyCleanup.clean(0, 'delayed'),
  nightlyCleanup.clean(0, 'wait'),
  nightlyCleanup.clean(0, 'active'),
  nightlyCleanup.clean(0, 'completed'),
  nightlyCleanup.clean(0, 'failed'),
])
  .then(() => {
    return nightlyCleanup.add(
      {},
      { jobId: 'Nightly', repeat: nightlyRepeatOpts, ...jobOpts },
    );
  })
  .then(() => {
    processor(nightlyCleanup, 'Nightly').process(() => {
      logger.info('Cleaning queues');
      return cleanQueues().then(() => {
        return syncFullGraph.add(
          {},
          { jobId: `${Date.now().toString()}`, ...jobOpts },
        );
      });
    });
  });
