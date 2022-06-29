export default function arrayToCSV(data) {
  return data
    .map(function (line) {
      return JSON.stringify(Object.values(line));
    })
    .join('\n')
    .replace(/(^\[)|(\]$)|(")/gm, '');
}
