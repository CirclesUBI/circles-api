import Safe from '@circles/safe-contracts/build/contracts/GnosisSafe.json';
import ProxyFactory from '@circles/safe-contracts/build/contracts/ProxyFactory.json';

import web3 from './web3';

import { ZERO_ADDRESS } from '~/constants';

// Helper function used in tests to create Safe instances associated to the
// given ganache accounts. The adminAccount doesn't have a Safe.
export async function createSafes(adminAccount, accounts) {
  const safeContract = new web3.eth.Contract(Safe.abi);
  const proxyFactoryContract = new web3.eth.Contract(ProxyFactory.abi);

  // Deploy Proxy factory
  let proxyFactory = await proxyFactoryContract
    .deploy({
      data: ProxyFactory.bytecode,
    })
    .send({
      from: adminAccount,
      gas: 10000000,
    });

  // Create Safe Master Copy
  let safeMaster = await safeContract
    .deploy({
      data: Safe.bytecode,
    })
    .send({
      from: adminAccount,
      gas: 10000000,
    });

  let safeInstances = [];
  let safeAddresses = [];

  for (let i = 0; i < accounts.length; i++) {
    // Create Gnosis Safe Data
    let gnosisSafeData = await safeMaster.methods
      .setup([accounts[i]], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS)
      .encodeABI();

    let proxyCreated = await proxyFactory.methods
      .createProxy(safeMaster.options.address, gnosisSafeData)
      .send({
        from: adminAccount,
        gas: 10000000,
      });

    safeAddresses[i] =
      proxyCreated.events['ProxyCreation'].returnValues['proxy'];

    safeInstances[i] = new web3.eth.Contract(Safe.abi, safeAddresses[i]);
  }

  return [safeInstances, safeAddresses];
}
