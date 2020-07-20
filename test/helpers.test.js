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
});
