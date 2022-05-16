import graph from './graph';
import logger from '../helpers/logger';

var currentEndpoint = graph.getCurrentEndpoint();
graph
  .differenceRule(currentEndpoint)
  .then((newEndpoint) => {
    if (typeof newEndpoint !== 'undefined') {
      graph.setCurrentEndpoint(newEndpoint, './config.json');
      logger.info('Grahnode endpoint changed to: ', newEndpoint);
    }
  })
  .catch(() => {
    logger.info('Unable to difference rule');
  });

graph
  .healthRule(currentEndpoint)
  .then((newEndpoint) => {
    if (typeof newEndpoint !== 'undefined') {
      graph.setCurrentEndpoint(newEndpoint, './config.json');
      logger.info('Grahnode endpoint changed to: ', newEndpoint);
    }
  })
  .catch(() => {
    logger.error('Unable to difference rule');
  });
