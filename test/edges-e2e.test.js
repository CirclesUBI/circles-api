import Hub from 'circles-contracts/build/contracts/Hub.json';
import fs from 'fs';
import { spawn } from 'child_process';

import web3, { provider, getWeb3Account } from './utils/web3';
import { convertToBaseUnit } from './utils/math';
import { createSafes, createTokens } from './utils/safes';

import { EDGES_FILE_PATH } from '~/constants';
//import { mockGraphBlockNumber } from './utils/mocks';

const NUM_ACCOUNTS = 4;

async function deleteEdgesFile() {
  return new Promise((resolve, reject) => {
    fs.stat(EDGES_FILE_PATH, (err, stats) => {
      if (!stats) {
        resolve();
        return;
      }
      fs.unlink(EDGES_FILE_PATH, (unlinkError) => {
        if (unlinkError) {
          reject(unlinkError);
        } else {
          resolve();
        }
      });
    });
  });
}

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Edges', () => {
  let hub;
  let worker;

  beforeAll(async () => {
    try {
      await deleteEdgesFile();
    } catch (err) {
      console.log(err);
    }

    const accountAddresses = await web3.eth.getAccounts();

    const accounts = accountAddresses
      .slice(0, NUM_ACCOUNTS)
      .map(getWeb3Account);

    const adminAccount = getWeb3Account(
      accountAddresses[accountAddresses.length - 1],
    );

    // console.log({ accounts, adminAccount });
    // console.log(
    //   'Balance in account: ' +
    //     (await web3.eth.getBalance(adminAccount.address)),
    // );

    const hubContract = new web3.eth.Contract(Hub.abi);

    hub = await hubContract
      .deploy({
        data: Hub.bytecode,
        arguments: [
          107,
          31556952,
          'CRC',
          'Circles',
          convertToBaseUnit(34),
          '92592592592592',
          '7776000',
        ],
      })
      .send({
        from: adminAccount.address,
        gas: 10000000,
      });

    // We have the ganache accounts, but we need to create also Safe accounts that will be owned by the ganache accounts.
    const { safeInstances, safeAddresses } = await createSafes(
      adminAccount.address,
      accounts.map(({ address }) => address),
    );
    //console.log({ safeAddresses, safeInstances });

    // One Token is created per Safe account
    const { tokenInstances, tokenAddresses } = await createTokens(
      accounts,
      safeInstances,
      hub,
      adminAccount.address,
    );
    const balance = await tokenInstances[0].methods
      .balanceOf(safeAddresses[0])
      .call();
    //console.log({ tokenAddresses, balance, tokenInstances });

    // Simulate UBI issuance through the update() method.
    // await new Promise((resolve) => setTimeout(resolve, 10000));
    // await tokenInstances[0].methods.update().call();
    // const balanceAfterUpdate = await tokenInstances[0].methods
    //   .balanceOf(safeAddresses[0])
    //   .call();
    // console.log({ balanceAfterUpdate });

    // Mock graph responses according to test cases
    // mockGraphBlockNumber(); // TODO: make the mock work with the child process
    // console.log(process.env.GRAPH_NODE_ENDPOINT);

    worker = spawn('npm', ['run', 'worker-test:serve'], {stdio: ['ignore', 'pipe', 'pipe']});
    worker.on('error', (err) => {
      console.error('Failed to start subprocess. Error: ', err);
    });
    worker.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    worker.on('close', (code, signal) => {
      console.log(`child process close all stdio with code ${code}`);
      if (signal)
        console.log(`child process terminated due to receipt of signal ${signal}`);
    });

    // Wait some seconds for the tasks to run
    await wait(30000);
  });

  it('indexes edges according to transactions made', async () => {

    // STEP 1
    // Read edges.json file
    const edgesRawData = fs.readFileSync(EDGES_FILE_PATH);
    const edges = JSON.parse(edgesRawData);
    expect(edges.length).toBe(0);

    // STEP 2
    // account A trusts account B -> safe[0] trusts safe[1]
    // account C trusts account B -> safe[2] trusts safe[1]
    await trust(
      new Array(accounts[0], accounts[1]),
      new Array(safeInstances[0], safeInstances[1]),
      hub,
      hubContract,
      adminAccount.address,
    );
  });

  afterAll(async () => {
    // clean up provider
    provider.stop();
    controller.kill('SIGHUP');
  });
});
