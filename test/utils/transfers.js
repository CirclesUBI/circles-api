import accounts from './accounts';
import { getSignature } from './common';

export async function createTransferPayload({
  from,
  to,
  transactionHash,
  paymentNote,
}) {
  const account = accounts[0];
  const address = account.address;
  const signature = await getSignature(account, [from, to, transactionHash]);

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
