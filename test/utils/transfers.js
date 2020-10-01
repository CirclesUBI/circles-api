import web3 from './web3';
import { getSignature } from './common';

export function createTransferPayload({
  from,
  to,
  transactionHash,
  paymentNote,
}) {
  const { address, privateKey } = web3.eth.accounts.create();
  const signature = getSignature([from, to, transactionHash], privateKey);

  return {
    address,
    signature,
    data: {
      from,
      to,
      transactionHash,
      paymentNote,
    },
  };
}
