import httpStatus from 'http-status';
import request from 'supertest';

import { mockGraphSafes, mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress } from './utils/common';

import app from '~';

describe('POST /transfers/update/:safeAddress - Update edges for safe', () => {
  beforeAll(async () => {
    mockGraphSafes();
  });

  it('should return an error when value is not positive', async () => {
    const safeAddress = randomChecksumAddress();

    await request(app)
      .post(`/api/transfers/update/${safeAddress}`)
      .send({
        safeAddress: safeAddress(),
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
});
