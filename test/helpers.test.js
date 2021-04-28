import reduceCapacities, { reduceCapacity } from '~/helpers/reduce';
import { minNumberString } from '~/helpers/compare';

describe('Helpers', () => {
  describe('minNumberString', () => {
    it('should return the string with the lower number', () => {
      expect(minNumberString('100000000', '200')).toBe('200');
      expect(minNumberString('1000', '5000')).toBe('1000');
      expect(minNumberString('100', '5000')).toBe('100');
      expect(minNumberString('5500', '5000')).toBe('5000');
      expect(minNumberString('5500000000', '70000000')).toBe('70000000');
      expect(minNumberString('20', '20')).toBe('20');

      for (let i = 0; i < 1000; i += 1) {
        const a = Math.floor(Math.random() * Math.MAX_SAFE_INTEGER);
        const b = Math.floor(Math.random() * Math.MAX_SAFE_INTEGER);

        expect(minNumberString(a.toString(), b.toString())).toBe(
          Math.min(a, b).toString(),
        );
      }
    });
  });

  describe('reduceCapacities', () => {
    it('should filter out the right number of edges with too small capacity', () => {
      const edges = [
        {
          // Omit these fields here as the method does not check for them ..
          // from: '0x0',
          // to: '0x1',
          // token: '0x0',
          capacity: '2000000000000000',
        },
        {
          capacity: '10000000000000',
        },
        {
          capacity: '91000000000000000',
        },
        {
          capacity: '2000000000000222',
        },
      ];

      expect(reduceCapacities(edges).length).toBe(3);
      expect(reduceCapacities(edges, 17).length).toBe(0);
      expect(reduceCapacities(edges, 2).length).toBe(4);

      const edgesSmall = [
        {
          capacity: '1000',
        },
        {
          capacity: '90',
        },
        {
          capacity: '9',
        },
        {
          capacity: '10000',
        },
      ];

      expect(reduceCapacities(edgesSmall, 1).length).toBe(3);
      expect(reduceCapacities(edgesSmall, 2).length).toBe(2);
      expect(reduceCapacities(edgesSmall, 3).length).toBe(2);
      expect(reduceCapacities(edgesSmall, 4).length).toBe(1);
      expect(reduceCapacities(edgesSmall, 5).length).toBe(0);
    });
  });

  describe('reduceCapacity', () => {
    it('should reduce capacity values correctly', () => {
      // Reduce the capacity correctly
      expect(reduceCapacity('17000000000000000')).toBe('16000000000000000');
      expect(reduceCapacity('1094000000000012345')).toBe('1093000000000012345');
      expect(reduceCapacity('9900000000000000000')).toBe('9899000000000000000');

      // With custom buffer size ..
      expect(reduceCapacity('9900000000000000000', 6)).toBe(
        '9899999999999000000',
      );

      // As large as the buffer ..
      expect(reduceCapacity('1000000000000000')).toBe('1000000000000000');

      // Too short ..
      expect(reduceCapacity('1000')).toBe('1000');
    });
  });
});
