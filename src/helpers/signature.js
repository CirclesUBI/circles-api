import web3 from '../services/web3';

export function checkSignature(fields, signature, claimedAddress) {
  const dataString = fields.join('');

  let recoveredAddress;
  try {
    recoveredAddress = web3.eth.accounts.recover(dataString, signature);
  } catch {
    // Do nothing ..
  }

  return recoveredAddress === claimedAddress;
}
