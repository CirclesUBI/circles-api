import Web3 from 'web3';
import Ganache from 'ganache-core';

export const provider = Ganache.provider({
  mnemonic:
    'enable depend figure right kit daughter job giraffe news window tonight more',
});
const web3 = new Web3(provider);

export default web3;
