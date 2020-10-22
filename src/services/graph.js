import fetch from 'isomorphic-fetch';

import loop from '../helpers/loop';
import core from './core';

const PAGINATION_SIZE = 500;

function isOfficialNode() {
  return process.env.GRAPH_NODE_ENDPOINT.includes('api.thegraph.com');
}

async function fetchFromGraphStatus(query) {
  const endpoint = isOfficialNode()
    ? `${process.env.GRAPH_NODE_ENDPOINT}/index-node/graphql`
    : `${process.env.GRAPH_NODE_ENDPOINT}/subgraphs`;

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

export async function fetchFromGraph(
  name,
  fields,
  extra = '',
  skip = 0,
  first = PAGINATION_SIZE,
) {
  const query = `{
    ${name}(${extra} first: ${first}, skip: ${skip}) {
      ${fields}
    }
  }`;

  const data = await core.utils.requestGraph({ query });
  return data[name];
}

async function* fetchGraphGenerator(name, fields, extra = '') {
  let skip = 0;
  let hasData = true;

  while (hasData) {
    const data = await fetchFromGraph(name, fields, extra, skip);
    hasData = data.length > 0;
    skip += PAGINATION_SIZE;
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
  return await waitForBlockNumber(0);
}

export async function waitForBlockNumber(blockNumber) {
  // Check if we're requesting The Graph's official endpoint as the API differs
  if (isOfficialNode()) {
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
  } else {
    const query = `{
      subgraphs {
        currentVersion {
          deployment {
            latestEthereumBlockNumber
          }
        }
      }
    }`;

    await loop(
      () => {
        return fetchFromGraphStatus(query);
      },
      (data) => {
        if (
          data.subgraphs.length === 0 ||
          !data.subgraphs[0].currentVersion ||
          !data.subgraphs[0].currentVersion.deployment
        ) {
          return false;
        }
        const {
          latestEthereumBlockNumber,
        } = data.subgraphs[0].currentVersion.deployment;
        return parseInt(latestEthereumBlockNumber, 10) >= blockNumber;
      },
    );
  }
}

export async function getBlockNumber() {
  // Check if we're requesting The Graph's official endpoint as the API differs
  if (isOfficialNode()) {
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
  } else {
    const query = `{
      subgraphs {
        currentVersion {
          deployment {
            latestEthereumBlockNumber
          }
        }
      }
    }`;

    const data = await fetchFromGraphStatus(query);
    if (
      data.subgraphs.length === 0 ||
      !data.subgraphs[0].currentVersion ||
      !data.subgraphs[0].currentVersion.deployment
    ) {
      return 0;
    }
    const {
      latestEthereumBlockNumber,
    } = data.subgraphs[0].currentVersion.deployment;
    return parseInt(latestEthereumBlockNumber, 10);
  }
}
