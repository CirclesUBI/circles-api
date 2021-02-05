import web3, { provider } from './utils/web3';

import app from '~';

describe('Edges', () => {
  beforeAll(async () => {
    const accounts = await web3.eth.getAccounts();
    console.log(`Accounts: ${accounts}`);
  });

  it('works', async () => {
    expect(true).toBe(true);
  });

  afterAll(async () => {
    // clean up provider
    provider.stop();
  });
});
