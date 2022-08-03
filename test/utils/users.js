import web3 from './web3';
import { getSignature } from './common';

export function createUserPayload(
  { nonce, safeAddress, username, email, avatarUrl },
  returnPrivateKey = false,
) {
  const { address, privateKey } = web3.eth.accounts.create();
  const signature = getSignature(
    [address, nonce, safeAddress, username],
    privateKey,
  );

  if (returnPrivateKey) {
    const payload = {
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
    return { payload, privateKey };
  } else {
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
}
