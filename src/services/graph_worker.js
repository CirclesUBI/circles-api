// run every 3 second - monitoring check rules
// when the rules are met it changes CURRENT_GRAPH_NODE_ENDPOINT
// when this change happens write to CURRENT_GRAPH_NODE_ENDPOINT

//import { currentEndpoint } from './test_graph';
// const mainEndpoint = process.env.GRAPH_NODE_ENDPOINT_MAIN;
// const backupEndpoint = process.env.GRAPH_NODE_ENDPOINT_BACKUP;

//import { rule1 } from './test_graph';
const ex = require('./test_graph');
ex.rule1()
  .then((endpoint) => {
    const currentEndpoint = endpoint;
    console.log('CURR', currentEndpoint);
  })
  .catch(() => {
    console.log('Unable to run rule 1');
  });
