// "100000000" > "200" returns false when comparing number strings but with
// this workaround we're able to compare long numbers as strings:
export function minNumberString(a, b) {
  // Which one is shorter?
  if (a.length < b.length) {
    return a;
  } else if (b.length < a.length) {
    return b;
  }

  // It does not matter, its the same string:
  if (a === b) {
    return a;
  }

  // If they have the same length, we can actually do this:
  return a < b ? a : b;
}
