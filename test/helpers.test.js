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
    it('should preserve object fields', () => {
      const edges = [
        {
          from: '0x0',
          to: '0x1',
          token: '0x3',
          capacity: '1000',
        },
      ];

      expect(reduceCapacities(edges, 3)).toEqual([
        {
          from: '0x0',
          to: '0x1',
          token: '0x3',
          capacity: '900',
        },
      ]);
    });

    it('should filter out the edges with too small capacity', () => {
      const edgesRegular = [
        // Omit these other fields here as the method does not use them
        // from: '0x0',
        // to: '0x1',
        // token: '0x0',
        { capacity: '2000000000000000' },
        { capacity: '10000000000000' },
        { capacity: '91000000000000000' },
        { capacity: '4500000000000222' },
      ];

      // default value
      expect(reduceCapacities(edgesRegular)).toEqual([
        { capacity: '1900000000000000' },
        { capacity: '90900000000000000' },
        { capacity: '4400000000000222' },
      ]);

      // custom values
      expect(reduceCapacities(edgesRegular, 17).length).toBe(0);
      expect(reduceCapacities(edgesRegular, 2).length).toBe(4);

      const edgesSmall = [
        { capacity: '9' },
        { capacity: '90' },
        { capacity: '1000' },
        { capacity: '10000' },
      ];

      expect(reduceCapacities(edgesSmall, 1)).toEqual([
        { capacity: '89' },
        { capacity: '999' },
        { capacity: '9999' },
      ]);
      expect(reduceCapacities(edgesSmall, 2)).toEqual([
        { capacity: '990' },
        { capacity: '9990' },
      ]);
      expect(reduceCapacities(edgesSmall, 3)).toEqual([
        { capacity: '900' },
        { capacity: '9900' },
      ]);
      expect(reduceCapacities(edgesSmall, 4)).toEqual([{ capacity: '9000' }]);
      expect(reduceCapacities(edgesSmall, 5)).toEqual([]);
    });
  });

  describe('reduceCapacity', () => {
    it('should reduce capacity values correctly', () => {
      expect(reduceCapacity('10000', 1)).toBe('9999');
      expect(reduceCapacity('10000', 2)).toBe('9990');
      expect(reduceCapacity('10000', 3)).toBe('9900');
      expect(reduceCapacity('10000', 4)).toBe('9000');

      expect(reduceCapacity('12345', 1)).toBe('12344');
      expect(reduceCapacity('12345', 2)).toBe('12335');
      expect(reduceCapacity('12345', 3)).toBe('12245');
      expect(reduceCapacity('12345', 4)).toBe('11345');

      expect(reduceCapacity('17000000000000000', 1)).toBe('16999999999999999');
      expect(reduceCapacity('17000000000000000', 2)).toBe('16999999999999990');
      expect(reduceCapacity('17000000000000000', 3)).toBe('16999999999999900');
      expect(reduceCapacity('17000000000000000', 4)).toBe('16999999999999000');
      expect(reduceCapacity('17000000000000000', 5)).toBe('16999999999990000');
      expect(reduceCapacity('17000000000000000', 6)).toBe('16999999999900000');
      expect(reduceCapacity('17000000000000000', 7)).toBe('16999999999000000');
      expect(reduceCapacity('17000000000000000', 8)).toBe('16999999990000000');
      expect(reduceCapacity('17000000000000000', 9)).toBe('16999999900000000');
      expect(reduceCapacity('17000000000000000', 10)).toBe('16999999000000000');
      expect(reduceCapacity('17000000000000000', 11)).toBe('16999990000000000');
      expect(reduceCapacity('17000000000000000', 12)).toBe('16999900000000000');
      expect(reduceCapacity('17000000000000000', 13)).toBe('16999000000000000');
      expect(reduceCapacity('17000000000000000', 14)).toBe('16990000000000000');
      expect(reduceCapacity('17000000000000000', 15)).toBe('16900000000000000');
      expect(reduceCapacity('17000000000000000', 16)).toBe('16000000000000000');

      expect(reduceCapacity('1094000000000012345', 1)).toBe('1094000000000012344');
      expect(reduceCapacity('1094000000000012345', 2)).toBe('1094000000000012335');
      expect(reduceCapacity('1094000000000012345', 3)).toBe('1094000000000012245');
      expect(reduceCapacity('1094000000000012345', 4)).toBe('1094000000000011345');
      expect(reduceCapacity('1094000000000012345', 5)).toBe('1094000000000002345');
      expect(reduceCapacity('1094000000000012345', 6)).toBe('1093999999999912345');
      expect(reduceCapacity('1094000000000012345', 7)).toBe('1093999999999012345');
      expect(reduceCapacity('1094000000000012345', 8)).toBe('1093999999990012345');
      expect(reduceCapacity('1094000000000012345', 9)).toBe('1093999999900012345');
      expect(reduceCapacity('1094000000000012345', 10)).toBe('1093999999000012345');
      expect(reduceCapacity('1094000000000012345', 11)).toBe('1093999990000012345');
      expect(reduceCapacity('1094000000000012345', 12)).toBe('1093999900000012345');
      expect(reduceCapacity('1094000000000012345', 13)).toBe('1093999000000012345');
      expect(reduceCapacity('1094000000000012345', 14)).toBe('1093990000000012345');
      expect(reduceCapacity('1094000000000012345', 15)).toBe('1093900000000012345');
      expect(reduceCapacity('1094000000000012345', 16)).toBe('1093000000000012345');
      expect(reduceCapacity('1094000000000012345', 17)).toBe('1084000000000012345');
      expect(reduceCapacity('1094000000000012345', 18)).toBe('994000000000012345');

      // Using default value
      expect(reduceCapacity('17000000000000000')).toBe('16900000000000000');
      expect(reduceCapacity('91000000000000000')).toBe('90900000000000000');
      expect(reduceCapacity('9999999999999999999')).toBe('9999899999999999999');
    });

    it('should not reduce capacity when the value is the same order of magnitude as the the buffer', () => {
      expect(reduceCapacity('10000', 5)).toBe('10000');
      expect(reduceCapacity('12345', 5)).toBe('12345');
      expect(reduceCapacity('11000000000000000', 17)).toBe('11000000000000000');
    });

    it('should not reduce capacity when the value is smaller than the buffer', () => {
      expect(reduceCapacity('1000', 15)).toBe('1000');
      expect(reduceCapacity('123', 4)).toBe('123');
    });
  });
});
