import httpStatus from 'http-status';
import request from 'supertest';

import {
  getTrustNetworkEdges,
  storeEdges,
  writeToFile,
} from '~/services/transfer';
import { mockGraphSafes } from './utils/mocks';
import { randomChecksumAddress } from './utils/common';

import app from '~';

describe('POST /transfers - Find transfer steps', () => {
  beforeAll(async () => {
    mockGraphSafes();

    // Simulate worker task to establish database
    const { edges } = await getTrustNetworkEdges();
    await writeToFile(edges);
    await storeEdges(edges);
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

  it('should return the transfer steps and maximumFlowValue', async () => {
    const from = '0xd0f9ec356953814Dd89f95BDf8dBAc8BC1e42316';
    const to = '0xF350BEc1376Ab9C38334A56EB2142f576f112891';
    const value = '12000000000000000000';

    await request(app)
      .post('/api/transfers')
      .send({
        from,
        to,
        value,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .then((response) => {
        const { data } = response.body;

        expect(data.from).toBe(from);
        expect(data.to).toBe(to);
        expect(data.maxFlowValue).toBe('12000000000000000000');
        expect(data.transferValue).toBe(value);
        expect(data.transferSteps.length).toBe(4);
      });
  });
});
