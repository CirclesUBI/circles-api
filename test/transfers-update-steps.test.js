import httpStatus from 'http-status';
import request from 'supertest';

import { mockGraphSafes, mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress } from './utils/common';
import { ZERO_ADDRESS } from '../src/constants';
import app from '~';

describe('POST /transfers/update/:safeAddress - Update edges for safe', () => {
  beforeAll(async () => {
    mockGraphSafes();
  });
  it('should fail when using the zero address', async () => {
    await request(app)
      .post(`/api/transfers/update`)
      .send({
        safeAddress: ZERO_ADDRESS,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.NOT_ACCEPTABLE);
  });
  it('should return ok even if limit is not passed', async () => {
    await request(app)
      .post(`/api/transfers/update`)
      .send({
        safeAddress: randomChecksumAddress(),
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.OK);
  });
});
