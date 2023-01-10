import httpStatus from 'http-status';
import request from 'supertest';

import { mockGraphSafes } from './utils/mocks';
import { randomChecksumAddress } from './utils/common';

import app from '~';

describe('POST /transfers - Find transfer steps', () => {
  beforeAll(async () => {
    mockGraphSafes();
  });

  it('should return an error when value is not positive', async () => {
    await request(app)
      .post('/api/transfers')
      .send({
        from: randomChecksumAddress(),
        to: randomChecksumAddress(),
        value: 0,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
  it('should return an error when hops is not positive', async () => {
    await request(app)
      .post('/api/transfers')
      .send({
        from: randomChecksumAddress(),
        to: randomChecksumAddress(),
        value: '5',
        hops: '0'
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
  it('should return an error when hops is empty', async () => {
    await request(app)
      .post('/api/transfers')
      .send({
        from: randomChecksumAddress(),
        to: randomChecksumAddress(),
        value: '5',
        hops: ''
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
});
