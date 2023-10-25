import { ethers } from 'ethers';

export function checkSignature(dataString, signature, claimedAddress) {
  let recoveredAddress;

  try {
    recoveredAddress = ethers.utils.verifyMessage(dataString, signature);
  } catch (err) {
    // Do nothing ..
  }

  return recoveredAddress === claimedAddress;
}
