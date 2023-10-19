import { ethers } from 'ethers';

export function checkSignature(fields, signature, claimedAddress) {
  const dataString = fields.join('');
  let recoveredAddress;
  try {
    recoveredAddress = ethers.utils.verifyMessage(dataString, signature);
  } catch (err) {
    // Do nothing ..
  }
  return recoveredAddress === claimedAddress;
}
