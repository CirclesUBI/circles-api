import Hub from 'circles-contracts/build/contracts/Hub.json';
import fs from 'fs';

import web3, { provider, getWeb3Account } from './utils/web3';
import { convertToBaseUnit } from './utils/math';
import { createSafes, createTokens } from './utils/safes';

import { EDGES_FILE_PATH } from '~/constants';
import { rebuildTrustNetwork } from '~/worker';
import { checkConnection } from '~/services/web3';

//import db from '~/database';

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

describe('Edges', () => {
  let hub;

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

    console.log({ accounts, adminAccount });
    console.log(
      'Balance in account: ' +
        (await web3.eth.getBalance(adminAccount.address)),
    );

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
    console.log({ tokenAddresses, balance, tokenInstances });

    // Simulate UBI issuance through the update() method.
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await tokenInstances[0].methods.update().call();
    const balanceAfterUpdate = await tokenInstances[0].methods
      .balanceOf(safeAddresses[0])
      .call();
    console.log({ balanceAfterUpdate });
  });

  it('indexes edges according to transactions made', async () => {
    // tmp Connect with postgres database
    console.log('start to authenticate to db');
    /*await db.authenticate()
      .then(() => {
        console.log('Database connection has been established successfully');
      })
      .catch(() => {
        console.log('Unable to connect to database');
        process.exit(1);
      });*/

    // hub knows about the users
    expect(true).toBe(true);
    // empty edges-test.json file
    const check = await checkConnection();
    console.log({ check });
    await rebuildTrustNetwork();
    //const edgesContent =
    //expect().
    const result = await hub.methods.signupBonus().call();
    console.log('RESULT: ' + result);
  });

  afterAll(async () => {
    // clean up provider
    provider.stop();
  });
});
