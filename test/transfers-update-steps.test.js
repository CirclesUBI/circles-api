import httpStatus from 'http-status';
import request from 'supertest';

import { mockGraphSafes } from './utils/mocks';
import { randomChecksumAddress } from './utils/common';

import app from '~';

describe('POST /transfers/update - Update transfer steps', () => {
  beforeAll(async () => {
    mockGraphSafes();
  });

  it('should return an error when value is not positive', async () => {
    await request(app)
      .post('/api/transfers/update')
      .send({
        from: randomChecksumAddress(),
        to: randomChecksumAddress(),
        value: 0,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
});
