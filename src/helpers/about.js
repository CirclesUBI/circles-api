import { exec } from 'child_process';
// const { exec } = require('child_process');

exec(
  'sh ${__dirname}/$PWD/scripts/get-api-version.sh',
  (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
    return stdout;
  },
);

// exec(
//   'grep -A0 "version" ${__dirname}/$PWD/package.json |  awk -F" \'{print $4}\'',
//   (err, stdout, stderr) => {
//     if (err) {
//       console.error(`exec error: ${err}`);
//       return;
//     }
//     return stdout;
//   },
// );
