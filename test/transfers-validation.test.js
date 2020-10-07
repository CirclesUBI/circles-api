import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';
import {
  randomChecksumAddress,
  randomTransactionHash,
  getSignature,
} from './utils/common';

import app from '~';

async function expectErrorStatus(body, status = httpStatus.BAD_REQUEST) {
  return await request(app)
    .put('/api/transfers')
    .send(body)
    .set('Accept', 'application/json')
    .expect(status);
}

describe('PUT /transfers - validation', () => {
  let address;
  let privateKey;
  let signature;
  let from;
  let to;
  let transactionHash;
  let paymentNote;
  let correctBody;

  beforeEach(() => {
    const account = web3.eth.accounts.create();

    address = account.address;
    privateKey = account.privateKey;

    from = randomChecksumAddress();
    to = randomChecksumAddress();
    transactionHash = randomTransactionHash();
    paymentNote = 'Thank you for the banana';

    signature = getSignature([from, to, transactionHash], privateKey);

    correctBody = {
      address,
      signature,
      data: {
        from,
        to,
        transactionHash,
        paymentNote,
      },
    };
  });

  describe('when using invalid parameters', () => {
    it('should return errors', async () => {
      // Missing fields
      await expectErrorStatus({
        ...correctBody,
        address: 'invalid',
      });

      // Missing signature
      await expectErrorStatus({
        ...correctBody,
        signature: '',
      });

      // Wrong address
      await expectErrorStatus({
        ...correctBody,
        address: web3.utils.randomHex(21),
      });

      // Wrong address checksum
      await expectErrorStatus({
        ...correctBody,
        address: web3.utils.randomHex(20),
      });

      // Invalid transaction hash
      await expectErrorStatus({
        ...correctBody,
        data: {
          ...correctBody.data,
          transaction: web3.utils.randomHex(10),
        },
      });

      // Invalid from field
      await expectErrorStatus({
        ...correctBody,
        data: {
          ...correctBody.data,
          from: web3.utils.randomHex(16),
        },
      });

      // Invalid payment note
      await expectErrorStatus({
        ...correctBody,
        data: {
          ...correctBody.data,
          paymentNote: 123,
        },
      });
    });
  });

  describe('when using invalid signatures', () => {
    it('should return errors', async () => {
      // Wrong address
      await expectErrorStatus(
        {
          ...correctBody,
          address: randomChecksumAddress(),
        },
        httpStatus.FORBIDDEN,
      );

      // Wrong from field
      await expectErrorStatus(
        {
          ...correctBody,
          data: {
            ...correctBody.data,
            from: randomChecksumAddress(),
          },
        },
        httpStatus.FORBIDDEN,
      );

      // Wrong transaction hash
      await expectErrorStatus(
        {
          ...correctBody,
          data: {
            ...correctBody.data,
            transactionHash: randomTransactionHash(),
          },
        },
        httpStatus.FORBIDDEN,
      );
    });
  });
});
