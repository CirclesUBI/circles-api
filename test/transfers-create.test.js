import httpStatus from 'http-status';
import request from 'supertest';

import { createTransferPayload } from './utils/transfers';
import { randomChecksumAddress, randomTransactionHash } from './utils/common';

import Transfer from '~/models/transfers';
import app from '~';

describe('PUT /transfers - Creating a new transfer', () => {
  let from;
  let to;
  let transactionHash;
  let paymentNote;

  let payload;

  beforeEach(() => {
    from = randomChecksumAddress();
    to = randomChecksumAddress();
    transactionHash = randomTransactionHash();
    paymentNote = 'Thank you for the banana';

    payload = createTransferPayload({
      from,
      to,
      transactionHash,
      paymentNote,
    });
  });

  afterAll(async () => {
    return await Transfer.destroy({
      where: {
        transactionHash,
      },
    });
  });

  it('should successfully respond and fail when we try again', async () => {
    await request(app)
      .put('/api/transfers')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    await request(app)
      .put('/api/transfers')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CONFLICT);
  });
});
