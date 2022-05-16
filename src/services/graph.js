import fs from 'fs';
import fetch from 'isomorphic-fetch';
import { CONFIG_PATH } from '../constants';
import logger from '../helpers/logger';
import loop from '../helpers/loop';
import core from './core';

const PAGINATION_SIZE = 500;
const MAIN_ENDPOINT = process.env.GRAPH_NODE_ENDPOINT_MAIN;
const BACKUP_ENDPOINT = process.env.GRAPH_NODE_ENDPOINT_BACKUP;

const LIMIT_SWITCH_TO_BACKUP = -5;
const LIMIT_SWITCH_TO_MAIN = 2;

// Get current graphnode endpoint from config file
export function getCurrentEndpoint() {
  let rawData = fs.readFileSync(CONFIG_PATH);
  let config = JSON.parse(rawData);
  logger.info(
    'Getting current endpoint from configuration file:  ',
    config.currentEndpoint,
  );
  return config.currentEndpoint;
}

// Set current graphnode endpoint in config file
export async function setCurrentEndpoint(endpoint) {
  let content = JSON.parse(fs.readFileSync(CONFIG_PATH));
  content.currentEndpoint = endpoint;
  const endpointJSON = JSON.stringify(content, null, 2);
  fs.writeFile(CONFIG_PATH, endpointJSON, (err) => {
    if (err) throw err;
    console.info(endpoint, 'written in configuration file.');
  });
}
// Checks whether is a production node or not
function isOfficialNode() {
  const prdEndpoints = [
    'https://api.thegraph.com',
    'https://graph.provisioning.circles.garden',
  ];
  const currentEndpoint = getCurrentEndpoint();
  return prdEndpoints.includes(currentEndpoint);
}

// Check graph-node endpoint status
async function fetchFromGraphStatus(graphEndpoint, query) {
  const endpoint = isOfficialNode()
    ? graphEndpoint + '/index-node/graphql'
    : graphEndpoint + ':8030/graphql';
  return await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query.replace(/\s\s+/g, ' '),
    }),
  })
    .then((response) => {
      return response.json();
    })
    .then((response) => {
      return response.data;
    });
}

// This function aims to replace `fetchFromGraphStatus()` when `index-node`
// requests don't work for thegraph.com/hosted-service
async function fetchFromSubgraphStatus(query) {
  const endpoint = `${process.env.GRAPH_NODE_ENDPOINT}/subgraphs/name/${process.env.SUBGRAPH_NAME}`;
  logger.info(`Graph endpoint: ${endpoint}`);
  return await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query.replace(/\s\s+/g, ' '),
    }),
  })
    .then((response) => {
      return response.json();
    })
    .then((response) => {
      return response.data;
    });
}

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function requestGraph(query) {
  // Strip newlines in query before doing request
  return await core.utils.requestGraph({
    query: query.replace(/(\r\n|\n|\r)/gm, ' '),
  });
}

export async function fetchFromGraph(
  name,
  fields,
  extra = '',
  lastID = '',
  first = PAGINATION_SIZE,
) {
  const query = `{
    ${name}(${extra} first: ${first}, orderBy: id, where: { id_gt: "${lastID}"}) {
      ${fields}
    }
  }`;
  const data = await requestGraph(query);
  if (!data) {
    logger.error(`Error requesting graph with query: ${query}`);
    return false;
  }
  return data[name];
}

async function* fetchGraphGenerator(name, fields, extra = '') {
  // The `skip` argument must be between 0 and 5000 (current limitations by TheGraph).
  // Therefore, we sort the elements by id and reference the last element id for the next query
  let hasData = true;
  let lastID = '';

  while (hasData) {
    //console.log({lastID});
    const data = await fetchFromGraph(name, fields, extra, lastID);
    await wait(500);
    hasData = data.length > 0;
    if (hasData) lastID = data[data.length - 1].id;
    yield data;
  }
}

export default async function fetchAllFromGraph(name, fields, extra = '') {
  let result = [];
  let index = 0;

  for await (let data of fetchGraphGenerator(name, fields, extra)) {
    result = result.concat(
      data.map((entry) => {
        entry.index = ++index;
        return entry;
      }),
    );
  }

  return result;
}

// export async function waitUntilGraphIsReady() {
//   const query = `{ _meta { block { number } } }`;
//   return await loop(
//     async () => {
//       try {
//         return await fetchFromSubgraphStatus(query);
//       } catch {
//         return false;
//       }
//     },
//     (isHealthy) => {
//       return isHealthy;
//     },
//   );
// }

export async function waitUntilGraphIsReady(graphEndpoint) {
  const query = `{ _meta { block { number } } }`;
  return await loop(
    async () => {
      try {
        let data = await fetchFromGraphStatus(graphEndpoint, query);
        return data.indexingStatusForCurrentVersion.health;
      } catch {
        return false;
      }
    },
    (isHealthy) => {
      return isHealthy === 'healthy';
    },
  );
}

export async function waitForBlockNumber(blockNumber) {
  const query = `{
    indexingStatusForCurrentVersion(subgraphName: "${process.env.SUBGRAPH_NAME}") {
      chains {
        latestBlock {
          number
        }
      }
    }
  }`;

  await loop(
    () => {
      return fetchFromGraphStatus(query);
    },
    (data) => {
      const { chains } = data.indexingStatusForCurrentVersion;
      if (chains.length === 0) {
        return false;
      }
      return parseInt(chains[0].latestBlock.number, 10) >= blockNumber;
    },
  );
}

export async function getBlockNumber(graphEndpoint) {
  const query = `{
    indexingStatusForCurrentVersion(subgraphName: "${process.env.SUBGRAPH_NAME}") {
      chains {
        latestBlock {
          number
        }
      }
    }
  }`;

  const data = await fetchFromGraphStatus(graphEndpoint, query);
  const { chains } = data.indexingStatusForCurrentVersion;
  if (chains.length === 0) {
    return 0;
  }
  return parseInt(chains[0].latestBlock.number, 10);
}

// Get subgraph status deployed in a given graphnode endpoint
async function getSubgraphStatus(graphEndpoint) {
  try {
    let subgraphFailing = false;
    const query = `{
      indexingStatusForCurrentVersion(subgraphName: "${process.env.SUBGRAPH_NAME}") {
       synced
       health
       fatalError {
        message
        block {
          number
          hash
        }
        handler
      }
      }
    }`;
    const data = await fetchFromGraphStatus(graphEndpoint, query);
    const status = data.indexingStatusForCurrentVersion;
    if (status.synced !== true) {
      subgraphFailing = true;
      console.error(
        'The subgraph  deployed in' + graphEndpoint + 'is not synchronised.',
      );
    } else if (status.health !== 'healthy') {
      subgraphFailing = true;
      console.error(
        'The subgraph  deployed in' + graphEndpoint + 'is not healthy.',
      );
    } else if (status.fatalError !== null) {
      subgraphFailing = true;
      console.error(
        'The subgraph  deployed in' +
          graphEndpoint +
          'has a fatal error' +
          status.fatalError +
          'with message' +
          status.fatalError.message,
      );
    }
    return subgraphFailing;
  } catch (error) {
    console.error('Could not get subgraph status.', error);
    return null;
  }
}

// Calculate block difference between graphnode main and backup endpoints
async function checkLatestBlockDifference() {
  const results = await Promise.allSettled([
    getBlockNumber(MAIN_ENDPOINT),
    getBlockNumber(BACKUP_ENDPOINT),
  ]);
  const fulfilled = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  if (fulfilled.length === 2) {
    let difference = fulfilled.map(
      (item, index, elements) => elements[index] - elements[index + 1],
    );
    return difference[0];
  } else {
    const rejected = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason);
    logger.info(
      'Cannot calculate difference between main and backup endpoints. ',
      rejected[0],
    );
    return null;
  }
}

// Check current graphnode endpoint is main(graph.provisioning.circles.garden)
function isCurrentEndpointMain() {
  const isMain = true;
  const currentEndpoint = getCurrentEndpoint();
  return currentEndpoint === MAIN_ENDPOINT ? isMain === true : isMain === false;
}

// Switch graphnode endpoints
async function switchToEndpoint(initialEndpoint, finalEndpoint) {
  var currentEndpoint = getCurrentEndpoint();
  const subgraphStatus = (await getSubgraphStatus(finalEndpoint))
    ? (currentEndpoint = initialEndpoint)
    : (currentEndpoint = finalEndpoint);
  return currentEndpoint;
}
// Difference rule: calculates the difference between main and backup and switchs when necessary
export async function differenceRule(endpoint) {
  try {
    const isMainEndpoint = await isCurrentEndpointMain(endpoint);
    const difference = await checkLatestBlockDifference();
    // The difference is calculated as main-backup therefore LIMIT_SWITCH_TO_BACKUP is negative.
    if (isMainEndpoint && difference <= LIMIT_SWITCH_TO_BACKUP) {
      logger.info('Switching from: ', MAIN_ENDPOINT, 'to: ', BACKUP_ENDPOINT);
      var newEndpoint = await switchToEndpoint(MAIN_ENDPOINT, BACKUP_ENDPOINT);
      // The difference is calculated as main-backup therefore LIMIT_SWITCH_TO_MAIN is positive.
    } else if (!isMainEndpoint && difference >= LIMIT_SWITCH_TO_MAIN) {
      logger.info('Switching from: ', BACKUP_ENDPOINT, 'to: ', MAIN_ENDPOINT);
      newEndpoint = await switchToEndpoint(BACKUP_ENDPOINT, MAIN_ENDPOINT);
    } else {
      logger.info('Graph node endpoint not changed.');
    }
    return newEndpoint;
  } catch (error) {
    logger.error('Error switching. ', error);
  }
}

export async function healthRule(endpoint) {
  try {
    const isMainEndpoint = await isCurrentEndpointMain(endpoint);
    if (isMainEndpoint) {
      const isFailing = await getSubgraphStatus(MAIN_ENDPOINT);
      if (isFailing) {
        logger.info('Switching from: ', MAIN_ENDPOINT, 'to: ', BACKUP_ENDPOINT);
        var newEndpoint = await switchToEndpoint(
          MAIN_ENDPOINT,
          BACKUP_ENDPOINT,
        );
      }
    } else if (!isMainEndpoint) {
      const isFailing = await getSubgraphStatus(BACKUP_ENDPOINT);
      if (isFailing) {
        logger.info('Switching from: ', BACKUP_ENDPOINT, 'to: ', MAIN_ENDPOINT);
        newEndpoint = await switchToEndpoint(BACKUP_ENDPOINT, MAIN_ENDPOINT);
      }
    } else {
      logger.info('Unable to check status for subgraphs');
    }
    return newEndpoint;
  } catch (error) {
    logger.error(error);
  }
}
