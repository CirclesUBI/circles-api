import fetch from 'isomorphic-fetch';

import logger from '../helpers/logger';
import loop from '../helpers/loop';
import core from './core';

const PAGINATION_SIZE = 500;

function isOfficialNode() {
  return process.env.GRAPH_NODE_ENDPOINT.includes('api.thegraph.com');
}

async function fetchFromGraphStatus(query) {
  const endpoint = isOfficialNode()
    ? `${process.env.GRAPH_NODE_ENDPOINT}/index-node/graphql`
    : `${process.env.GRAPH_NODE_INDEXING_STATUS_ENDPOINT}/graphql`;
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
  const endpoint = `${process.env.GRAPH_NODE_ENDPOINT}/subgraphs/name/${process.env.SUBGRAPH_NAME}`
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

export async function waitUntilGraphIsReady() {
  const query = `{ _meta { block { number } } }`;
  return await loop(
    async () => {
      try {
        return await fetchFromSubgraphStatus(query);
      } catch {
        return false;
      }
    },
    (isHealthy) => {
      return isHealthy
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

export async function getBlockNumber() {
  const query = `{
    indexingStatusForCurrentVersion(subgraphName: "${process.env.SUBGRAPH_NAME}") {
      chains {
        latestBlock {
          number
        }
      }
    }
  }`;

  const data = await fetchFromGraphStatus(query);
  const { chains } = data.indexingStatusForCurrentVersion;
  if (chains.length === 0) {
    return 0;
  }
  return parseInt(chains[0].latestBlock.number, 10);
}
