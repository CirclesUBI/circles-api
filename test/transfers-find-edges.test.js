import web3 from './utils/web3';

import { findEdgesInGraphData } from '~/services/edgesGraph';

const SAFE_A = '0xA';
const SAFE_B = '0xB';
const SAFE_C = '0xC';
const TOKEN_A = '01A';
const TOKEN_B = '0x1B';
const TOKEN_C = '0x1C';

const toWei = (value) => {
  return web3.utils.toWei(value.toString(), 'ether');
};

const expectEdge = (edges, expected) => {
  expect(
    edges.find(({ from, to, capacity, token }) => {
      return (
        from === expected.from &&
        to === expected.to &&
        capacity === expected.capacity &&
        token === expected.token
      );
    }),
  ).toEqual(expected);
};

describe('findEdgesInGraphData', () => {
  it('should find edges based on trust connections', () => {
    const connections = [
      {
        canSendToAddress: SAFE_A,
        limit: toWei(50),
        userAddress: SAFE_A,
      },
      {
        canSendToAddress: SAFE_B,
        limit: toWei(75),
        userAddress: SAFE_B,
      },
      {
        canSendToAddress: SAFE_B,
        limit: toWei(80),
        userAddress: SAFE_A,
      },
      {
        canSendToAddress: SAFE_A,
        limit: toWei(100),
        userAddress: SAFE_B,
      },
    ];

    const safes = [
      {
        address: SAFE_A,
        tokens: [
          {
            address: TOKEN_A,
            balance: toWei(50),
          },
        ],
      },
      {
        address: SAFE_B,
        tokens: [
          {
            address: TOKEN_B,
            balance: toWei(75),
          },
          {
            address: TOKEN_A,
            balance: toWei(50),
          },
        ],
      },
    ];

    const tokens = [
      {
        address: TOKEN_A,
        safeAddress: SAFE_A,
      },
      {
        address: TOKEN_B,
        safeAddress: SAFE_B,
      },
    ];

    const edges = findEdgesInGraphData({
      connections,
      safes,
      tokens,
    });

    // Safe A can send 25 A Token to Safe B (capped by the balance)
    expectEdge(edges, {
      from: SAFE_A,
      to: SAFE_B,
      capacity: toWei(50),
      token: SAFE_A,
    });

    // Safe B can send 75 B Token to Safe A (capped by the trust limit)
    expectEdge(edges, {
      from: SAFE_B,
      to: SAFE_A,
      capacity: toWei(75),
      token: SAFE_B,
    });

    // Safe B can send 50 A Token to Safe A
    expectEdge(edges, {
      from: SAFE_B,
      to: SAFE_A,
      capacity: toWei(50),
      token: SAFE_A,
    });

    expect(edges.length).toBe(3);
  });

  it('should find edges without any trust', () => {
    const connections = [
      {
        canSendToAddress: SAFE_A,
        limit: toWei(90),
        userAddress: SAFE_A,
      },
      {
        canSendToAddress: SAFE_B,
        limit: toWei(100),
        userAddress: SAFE_B,
      },
      {
        canSendToAddress: SAFE_C,
        limit: toWei(100),
        userAddress: SAFE_C,
      },
    ];

    const safes = [
      {
        address: SAFE_A,
        tokens: [
          {
            address: TOKEN_A,
            balance: toWei(90),
          },
        ],
      },
      {
        address: SAFE_B,
        tokens: [
          {
            address: TOKEN_B,
            balance: toWei(100),
          },
        ],
      },
      {
        address: SAFE_C,
        tokens: [
          {
            address: TOKEN_C,
            balance: toWei(100),
          },
          {
            address: TOKEN_A,
            balance: toWei(10),
          },
        ],
      },
    ];

    const tokens = [
      {
        address: TOKEN_A,
        safeAddress: SAFE_A,
      },
      {
        address: TOKEN_B,
        safeAddress: SAFE_B,
      },
      {
        address: TOKEN_C,
        safeAddress: SAFE_C,
      },
    ];

    const edges = findEdgesInGraphData({
      connections,
      safes,
      tokens,
    });

    expectEdge(edges, {
      from: SAFE_C,
      to: SAFE_A,
      capacity: toWei(10),
      token: SAFE_A,
    });

    expect(edges.length).toBe(1);
  });

  it('should find edges when there is a safe without an own token (organisation)', () => {
    const connections = [
      {
        canSendToAddress: SAFE_A,
        limit: toWei(100),
        userAddress: SAFE_A,
      },
      {
        canSendToAddress: SAFE_C,
        limit: toWei(98),
        userAddress: SAFE_A,
      },
    ];

    const safes = [
      {
        address: SAFE_A,
        tokens: [
          {
            address: TOKEN_A,
            balance: toWei(98),
          },
        ],
      },
      {
        address: SAFE_C,
        tokens: [
          {
            address: TOKEN_A,
            balance: toWei(2),
          },
        ],
      },
    ];

    const tokens = [
      {
        address: TOKEN_A,
        safeAddress: SAFE_A,
      },
    ];

    const edges = findEdgesInGraphData({
      connections,
      safes,
      tokens,
    });

    // Safe A can send A Token to the Safe C
    expectEdge(edges, {
      from: SAFE_A,
      to: SAFE_C,
      capacity: toWei(98),
      token: SAFE_A,
    });

    // Safe C can send A Token to Safe A
    expectEdge(edges, {
      from: SAFE_C,
      to: SAFE_A,
      capacity: toWei(2),
      token: SAFE_A,
    });

    expect(edges.length).toBe(2);
  });
});
