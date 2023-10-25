import Web3 from 'web3';
import HDWalletProvider from '@truffle/hdwallet-provider';

import privateKeys from './accounts.json';

export default function setupWeb3() {
  const provider = new HDWalletProvider({
    privateKeys,
    providerOrUrl:
      process.env.ETHEREUM_NODE_ENDPOINT || 'http://localhost:8545',
  });
  const web3 = new Web3(provider);

  return {
    web3,
    provider,
  };
}
