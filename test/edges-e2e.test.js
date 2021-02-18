import Hub from 'circles-contracts/build/contracts/Hub.json';
import Token from 'circles-contracts/build/contracts/Token.json';

import web3, { provider, getWeb3Account } from './utils/web3';
import { convertToBaseUnit } from './utils/math';
import { createSafes, execTransaction } from './utils/safes';

const NUM_ACCOUNTS = 4;

describe('Edges', () => {
  let hub;

  beforeAll(async () => {
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
    const [safeInstances, safeAddresses] = await createSafes(
      adminAccount.address,
      accounts.map(({ address }) => address),
    );

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

    const { events, ...receipt } = await execTransaction(
      accounts[0],
      safeInstances[0],
      {
        to: hub.options.address,
        from: adminAccount.address,
        txData: hub.methods.signup().encodeABI(),
      },
    );
    console.log({ receipt, events });

    const tokenAddress = await hub.methods.userToToken(safeAddresses[0]).call();
    const tokenContract = new web3.eth.Contract(Token.abi, tokenAddress);
    const balance = await tokenContract.methods
      .balanceOf(safeAddresses[0])
      .call();
    console.log({ tokenAddress, balance });

    await new Promise((resolve) => setTimeout(resolve, 10000));
    await tokenContract.methods.update().call();
    const balanceAfterUpdate = await tokenContract.methods
      .balanceOf(safeAddresses[0])
      .call();
    console.log({ balanceAfterUpdate });
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
