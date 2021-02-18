import Web3 from 'web3';
import Ganache from 'ganache-core';

import { private_keys } from './../data/keys.json';

export const provider = Ganache.provider({
  mnemonic:
    'enable depend figure right kit daughter job giraffe news window tonight more',
  default_balance_ether: 10000,
  gasLimit: '0xfffffffffff',
});
const web3 = new Web3(provider);

export function getWeb3Account(accountAddress) {
  const privateKey = private_keys[accountAddress.toLowerCase()];
  return web3.eth.accounts.privateKeyToAccount(privateKey);
}

export default web3;
