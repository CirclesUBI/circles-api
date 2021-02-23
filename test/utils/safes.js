import Safe from '@circles/safe-contracts/build/contracts/GnosisSafe.json';
import ProxyFactory from '@circles/safe-contracts/build/contracts/ProxyFactory.json';
import Token from 'circles-contracts/build/contracts/Token.json';
import Hub from 'circles-contracts/build/contracts/Hub.json';

import { formatTypedData, signTypedData } from './typedData';
import web3 from './web3';

import { ZERO_ADDRESS } from '~/constants';

// Helper function used in tests to create Safe instances associated to the
// given ganache accounts. The adminAccount doesn't have a Safe.
export async function createSafes(adminAccountAddress, accountAddresses) {
  const safeContract = new web3.eth.Contract(Safe.abi);
  const proxyFactoryContract = new web3.eth.Contract(ProxyFactory.abi);

  // Deploy Proxy factory
  let proxyFactory = await proxyFactoryContract
    .deploy({
      data: ProxyFactory.bytecode,
    })
    .send({
      from: adminAccountAddress,
      gas: 10000000,
    });

  // Create Safe Master Copy
  let safeMaster = await safeContract
    .deploy({
      data: Safe.bytecode,
    })
    .send({
      from: adminAccountAddress,
      gas: 10000000,
    });

  let safeInstances = [];
  let safeAddresses = [];

  for (let i = 0; i < accountAddresses.length; i++) {
    // Create Gnosis Safe Data
    let gnosisSafeData = await safeMaster.methods
      .setup(
        [accountAddresses[i]],
        1,
        ZERO_ADDRESS,
        '0x',
        ZERO_ADDRESS,
        0,
        ZERO_ADDRESS,
      )
      .encodeABI();

    let proxyCreated = await proxyFactory.methods
      .createProxy(safeMaster.options.address, gnosisSafeData)
      .send({
        from: adminAccountAddress,
        gas: 10000000,
      });

    safeAddresses[i] =
      proxyCreated.events['ProxyCreation'].returnValues['proxy'];

    safeInstances[i] = new web3.eth.Contract(Safe.abi, safeAddresses[i]);
  }

  return [safeInstances, safeAddresses];
}

export async function createTokens(
  accounts,
  safeInstances,
  hub,
  adminAccountAddress,
) {
  let tokenInstances = [];
  let tokenAddresses = [];

  for (let i = 0; i < accounts.length; i++) {
    await execTransaction(accounts[i], safeInstances[i], {
      to: hub.options.address,
      from: adminAccountAddress,
      txData: hub.methods.signup().encodeABI(),
    });
    tokenAddresses[i] = await hub.methods
      .userToToken(safeInstances[i].options.address)
      .call();
    tokenInstances[i] = new web3.eth.Contract(Token.abi, tokenAddresses[i]);
  }
  return [tokenInstances, tokenAddresses];
}

async function execTransaction(
  account,
  safeInstance,
  { to, from, value = 0, txData },
) {
  const operation = 0; // CALL
  const safeTxGas = '100000000'; // based on data // @TODO: CHANGE
  const baseGas = '10000000'; // general transaction // @TODO: CHANGE
  const gasPrice = 0; // no refund
  const gasToken = ZERO_ADDRESS; // Paying in Eth
  const refundReceiver = ZERO_ADDRESS;
  const nonce = await safeInstance.methods.nonce().call();
  const safeAddress = safeInstance.options.address;

  const typedData = formatTypedData({
    to,
    value,
    txData,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
    verifyingContract: safeAddress,
  });

  const signature = signTypedData(account.privateKey, typedData);
  const signatures = signature;

  return await safeInstance.methods
    .execTransaction(
      to,
      value,
      txData,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      signatures,
    )
    .send({ from, gas: '10000000000' }); // @TODO: '1266349' ?  Need to change gas, safeTxGase, baseGas
}
