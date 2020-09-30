import web3 from './web3';

export function randomChecksumAddress() {
  return web3.utils.toChecksumAddress(web3.utils.randomHex(20));
}

export function randomTransactionHash() {
  return web3.utils.randomHex(32);
}

export function getSignature(fields, privateKey) {
  const data = fields.join('');
  const { signature } = web3.eth.accounts.sign(data, privateKey);
  return signature;
}
