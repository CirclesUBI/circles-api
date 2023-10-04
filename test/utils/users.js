import { getSignature } from './common';

export function createUserPayload(
  { nonce, safeAddress, username, email, avatarUrl, account = {} },
  returnPrivateKey = false,
) {
  const address = account.address;
  const privateKey = account.privateKey;
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
