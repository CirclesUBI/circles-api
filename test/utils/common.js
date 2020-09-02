import web3 from './web3';

export function randomChecksumAddress() {
  return web3.utils.toChecksumAddress(web3.utils.randomHex(20));
}

export function getSignature(
  address,
  nonce,
  safeAddress,
  username,
  privateKey,
) {
  const data = `${address}${nonce}${safeAddress}${username}`;
  const { signature } = web3.eth.accounts.sign(data, privateKey);
  return signature;
}
