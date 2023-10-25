import web3 from './web3';

export function randomChecksumAddress() {
  return web3.utils.toChecksumAddress(web3.utils.randomHex(20));
}

export function randomTransactionHash() {
  return web3.utils.randomHex(32);
}

export async function getSignature(account, fields) {
  const data = fields.join('');
  const signature = await account.signMessage(data);
  return signature;
}
