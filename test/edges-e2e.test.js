import Hub from 'circles-contracts/build/contracts/Hub.json';

import web3, { provider } from './utils/web3';
import { convertToBaseUnit } from './utils/math';
import { createSafes } from './utils/safes';

describe('Edges', () => {
  let hub;

  beforeAll(async () => {
    const accounts = await web3.eth.getAccounts();
    console.log(`Accounts: ${accounts}`);
    console.log(
      'Balance in account: ' + (await web3.eth.getBalance(accounts[0])),
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
          convertToBaseUnit(50),
          '92592592592592',
          '7776000',
        ],
      })
      .send({
        from: accounts[0],
        gas: 10000000,
      });

    // We have the ganache accounts, but we need to create also Safe accounts that will be owned by the ganache accounts.
    const [safeInstances, safeAddresses] = await createSafes(accounts);

    for (let i = 0; i < safeInstances.length; i++) {
      console.log(
        '**** ',
        i,
        "- safe instance's owner: ",
        await safeInstances[i].methods.getOwners().call(),
      );
    }

    for (let i = 0; i < safeAddresses.length; i++) {
      console.log('**** ', i, '- safe address: ', safeAddresses[i]);
    }
  });

  it('works', async () => {
    expect(true).toBe(true);
    const result = await hub.methods.signupBonus().call();
    console.log('RESULT: ' + result);
  });

  afterAll(async () => {
    // clean up provider
    provider.stop();
  });
});
