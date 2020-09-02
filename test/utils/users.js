import web3 from './web3';
import { getSignature } from './common';

export function createUserPayload({
  nonce,
  safeAddress,
  username,
  email,
  avatarUrl,
}) {
  const { address, privateKey } = web3.eth.accounts.create();

  const signature = getSignature(
    address,
    nonce,
    safeAddress,
    username,
    privateKey,
  );

  return {
    address,
    nonce,
    signature,
    data: {
      safeAddress,
      username,
      email,
      avatarUrl,
    },
  };
}
