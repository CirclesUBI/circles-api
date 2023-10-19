import httpStatus from 'http-status';
import request from 'supertest';
import accounts from './utils/accounts';
import { mockGraphUsers } from './utils/mocks';
import {
  randomTransactionHash,
  randomChecksumAddress,
  getSignature,
} from './utils/common';

import Transfer from '~/models/transfers';
import app from '~';

const NUM_TEST_TRANSFERS = 5;

const transfers = [];
// const accounts = [];

async function expectTransfer(app, account, { transactionHash, from, to }) {
  mockGraphUsers(account.address, to);
  const signature = await getSignature(account, [transactionHash]);

  return await request(app)
    .post(`/api/transfers/${transactionHash}`)
    .send({
      address: account.address,
      signature,
    })
    .set('Accept', 'application/json')
    .expect(httpStatus.OK)
    .expect(({ body }) => {
      if (!('id' in body.data)) {
        throw new Error('id missing');
      }

      if (body.data.transactionHash !== transactionHash) {
        throw new Error('Wrong transactionHash');
      }

      if (body.data.from !== from) {
        throw new Error('Wrong from address');
      }

      if (body.data.to !== to) {
        throw new Error('Wrong to address');
      }
    });
}

beforeAll(async () => {
  const items = new Array(NUM_TEST_TRANSFERS).fill(0);

  await Promise.all(
    items.map(async (item, index) => {
      const address = accounts[index].address;
      const from = randomChecksumAddress();
      const to = randomChecksumAddress();
      const transactionHash = randomTransactionHash();
      const paymentNote = `This is a payment note ${Math.random() * 10000}`;

      const signature = await getSignature(accounts[index], [
        from,
        to,
        transactionHash,
      ]);

      await request(app)
        .put('/api/transfers')
        .send({
          address,
          signature,
          data: {
            from,
            to,
            transactionHash,
            paymentNote,
          },
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      // accounts.push(account);

      transfers.push({
        from,
        to,
        transactionHash,
        paymentNote,
      });
    }),
  );
});

afterAll(async () => {
  await Promise.all(
    transfers.map(async (transfer) => {
      return await Transfer.destroy({
        where: {
          transactionHash: transfer.transactionHash,
        },
      });
    }),
  );
});

describe('POST /transfers/:transactionHash - Resolve by transactionHash', () => {
  it('should find one transfer', async () => {
    await Promise.all(
      transfers.map(async (transfer, index) => {
        const account = accounts[index];
        return await expectTransfer(app, account, transfer);
      }),
    );
  });

  it('should throw an error when signature is invalid', async () => {
    const transactionHash = transfers[1].transactionHash;
    const account = accounts[1];
    const signature = await getSignature(account, [randomTransactionHash()]);

    await request(app)
      .post(`/api/transfers/${transactionHash}`)
      .send({
        address: account.address,
        signature,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.FORBIDDEN);
  });

  describe('validation', () => {
    let sender;
    let receiver;
    let from;
    let to;
    let transactionHash;
    let paymentNote;

    beforeEach(async () => {
      sender = accounts[1];
      receiver = accounts[2];

      from = randomChecksumAddress();
      to = randomChecksumAddress();
      transactionHash = randomTransactionHash();
      paymentNote = 'Thank you!';

      const signature = await getSignature(sender, [from, to, transactionHash]);

      await request(app)
        .put('/api/transfers')
        .send({
          address: sender.address,
          signature,
          data: {
            from,
            to,
            transactionHash,
            paymentNote,
          },
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      mockGraphUsers(sender.address, from);
      mockGraphUsers(receiver.address, to);
    });

    it('should return the result for only sender or receiver', async () => {
      const senderSignature = await getSignature(sender, [transactionHash]);
      const receiverSignature = await getSignature(receiver, [transactionHash]);

      await request(app)
        .post(`/api/transfers/${transactionHash}`)
        .send({
          address: sender.address,
          signature: senderSignature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);

      await request(app)
        .post(`/api/transfers/${transactionHash}`)
        .send({
          address: receiver.address,
          signature: receiverSignature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });

    it('should return an error when signature is valid but entry was not found', async () => {
      const wrongTransactionHash = randomTransactionHash();
      const senderSignature = await getSignature(sender, [
        wrongTransactionHash,
      ]);

      await request(app)
        .post(`/api/transfers/${wrongTransactionHash}`)
        .send({
          address: sender.address,
          signature: senderSignature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.NOT_FOUND);
    });

    it('should throw an error when sender or receiver is not the signer', async () => {
      const thirdAccount = accounts[4];
      const signature = await getSignature(thirdAccount, [transactionHash]);

      mockGraphUsers(thirdAccount.address, randomChecksumAddress());

      await request(app)
        .post(`/api/transfers/${transactionHash}`)
        .send({
          address: thirdAccount.address,
          signature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.FORBIDDEN);
    });
  });
});
