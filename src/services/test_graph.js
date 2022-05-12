const fetch = require('isomorphic-fetch');
const mainEndpoint = process.env.GRAPH_NODE_ENDPOINT_MAIN;
const backupEndpoint = process.env.GRAPH_NODE_ENDPOINT_BACKUP;
var currentEndpoint = process.env.GRAPH_NODE_ENDPOINT_MAIN;

// TODO: figure out why IMPORT doesnt work
// TODO: change console.log for loggers
// Checks whether is a production node or not
function isOfficialNode() {
  const prdEndpoints = [
    'https://api.thegraph.com',
    'https://graph.provisioning.circles.garden',
  ];
  return prdEndpoints.includes(currentEndpoint);
}

function setCurrentEndpoint(endpoint) {}

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

// Get latest block number
async function getBlockNumber(graphEndpoint) {
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
        'The subgraph  deployed in' + currentEndpoint + 'is not synchronised',
      );
    } else if (status.health !== 'healthy') {
      subgraphFailing = true;
      console.error(
        'The subgraph  deployed in' + currentEndpoint + 'is not healthy',
      );
    } else if (status.fatalError !== null) {
      subgraphFailing = true;
      console.error(
        'The subgraph  deployed in' +
          currentEndpoint +
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

// Calculate block difference between main and backup
async function checkLatestBlockDifference() {
  const results = await Promise.allSettled([
    getBlockNumber(mainEndpoint),
    getBlockNumber(backupEndpoint),
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
    console.log(
      'Cannot calculate difference between main and backup endpoints. ',
      rejected[0],
    );
    return null;
  }
}

// check current endpoint is the main endpoint graph.provisioning.circles.garden
function isCurrentEndpointMain() {
  const isMain = true;
  return currentEndpoint === mainEndpoint ? isMain === true : isMain === false;
}

// switch graphnode endpoints
async function switchToEndpoint(initialEndpoint, finalEndpoint) {
  const subgraphStatus = (await getSubgraphStatus(finalEndpoint))
    ? (currentEndpoint = initialEndpoint)
    : (currentEndpoint = finalEndpoint);
  return currentEndpoint;
}
// Rule 1

async function rule1(endpoint) {
  try {
    const isMainEndpoint = await isCurrentEndpointMain(endpoint); // check if the current endpoint is main
    const difference = await checkLatestBlockDifference(); // get block difference between main and backup
    //estoy en main y la differencia es mayor de 5 --> switch to backup but first check if backup is healthy, si no nos quedamos en main
    // promise.allsettled returns main, backup in order therefore main-backup would be negative and we choose 5 to start with
    console.log(endpoint);
    console.log('isMainEndpoint  ', isMainEndpoint);
    console.log('difference', difference);
    if (isMainEndpoint && difference <= -5) {
      // check destiny graph status true is failing, false is not failing
      console.log('Switching from', mainEndpoint, 'to', backupEndpoint);
      currentEndpoint = await switchToEndpoint(mainEndpoint, backupEndpoint);
      // no estoy en main y la differencia es mayor que 2 entre backup and main ---> switch back to main
    } else if (!isMainEndpoint && difference >= 2) {
      console.log('Switching from', backupEndpoint, 'to', mainEndpoint);
      currentEndpoint = await switchToEndpoint(backupEndpoint, mainEndpoint);
    } else {
      console.log('Graph node endpoint not changed.');
    }
    return currentEndpoint;
  } catch (error) {
    console.log('Error switching. ', error);
  }
}

async function rule2() {
  try {
    const isMainEndpoint = await isCurrentEndpointMain(currentEndpoint); // check if the current endpoint is main
    console.log(isMainEndpoint);
    if (isMainEndpoint) {
      const isFailing = await getSubgraphStatus(mainEndpoint);
      if (isFailing) {
        console.log(isFailing);
        console.log('Switching from', mainEndpoint, 'to', backupEndpoint);
        currentEndpoint = await switchToEndpoint(mainEndpoint, backupEndpoint);
      }
    } else if (!isMainEndpoint) {
      const isFailing = await getSubgraphStatus(backupEndpoint);
      if (isFailing) {
        console.log('Switching from', backupEndpoint, 'to', mainEndpoint);
        currentEndpoint = await switchToEndpoint(backupEndpoint, mainEndpoint);
      }
    } else {
      console.log('Unable to check status fro subgraphs');
    }
    return currentEndpoint;
  } catch (error) {
    console.log(error);
  }
}
async function rule2b(end) {
  try {
    const isMainEndpoint = await isCurrentEndpointMain(currentEndpoint); // check if the current endpoint is main
    console.log(isMainEndpoint);
    if (isMainEndpoint) {
      const isFailing = await getSubgraphStatus(mainEndpoint);
      if (isFailing) {
        console.log(isFailing);
        console.log('Switching from', mainEndpoint, 'to', backupEndpoint);
        currentEndpoint = await switchToEndpoint(mainEndpoint, backupEndpoint);
      }
    } else if (!isMainEndpoint) {
      const isFailing = await getSubgraphStatus(backupEndpoint);
      if (isFailing) {
        console.log('Switching from', backupEndpoint, 'to', mainEndpoint);
        currentEndpoint = await switchToEndpoint(backupEndpoint, mainEndpoint);
      }
    } else {
      console.log('Unable to check status fro subgraphs');
    }
    return currentEndpoint;
  } catch (error) {
    console.log(error);
  }
}

// const setCurrentEndpoint = (endpoint) => (currentEndpoint = endpoint);
// const getCurrentEndpoint = () => currentEndpoint;

// rule1()
//   .then((endpoint) => {
//     console.log('endddd', endpoint);
//     setCurrentEndpoint(endpoint);
//     currentEndpoint = endpoint;
//     console.log('CURR', currentEndpoint);
//   })
//   .catch(() => {
//     console.log('Unable to run rule 1');
//   });
// }
// module.exports = {
//   getCurrentEndpoint,
// };

// const currentEndpointPromise = rule1().then((endpoint) => endpoint);

// currentEndpointPromise.then((endpoint) => {
//   const currentEndpoint = endpoint;
//   console.log('CURR', currentEndpoint);
// });

// TEST

// var result;
// result = isOfficialNode('http:graph_local');
// console.log(result);

// getBlockNumber(mainEndpoint).then((block) =>
//   console.log(mainEndpoint, block),
// );

// fetchFromGraphStatus(GRAPH_NODE_ENDPOINT_MAIN, querytest).then((result) =>
//   console.log(result),
// );
// const query = `{
//   indexingStatusForCurrentVersion(subgraphName: "${process.env.SUBGRAPH_NAME}") {
//     chains {
//       latestBlock {
//         number
//       }
//     }
//   }
// }`;

// fetchFromGraphStatus('http://graph.circles.lan', query).then((result) =>
//   console.log(result),
// );
// fetchFromGraphStatus(mainEndpoint, query).then((result) =>
//   console.log(result),
// );

// checkLatestBlockDifference().then((block) =>
//   console.log('difference  --> ', block),
// );
// var isMainEendpoint = isCurrentEndpointMain();
// console.log('isMainEendpoint', isMainEendpoint);

// getSubgraphStatus(mainEndpoint).then((status) =>
//   console.log('status  --> ', status),
// );
// isSubgraphHealthy(mainEndpoint).then((sss) =>
//   console.log('Checking status subgraph --', sss),
// );
// isSubgraphHealthy(mainEndpoint).then((value) => console.log(value));
// //rule();
// console.log('currentEndpoint' + currentEndpoint);

// //switchSubgraph(backupEndpoint).then((sss) => console.log('Switching --', sss));
//rule().then((endpoint) => console.log(endpoint));
//rule2().then((endpoint) => console.log(endpoint));

// console.log(currentEndpoint);
// var rest = isCurrentEndpointMain();
// console.log(rest);
// switchToEndpoint(mainEndpoint, backupEndpoint);

module.exports.rule1 = rule1;
