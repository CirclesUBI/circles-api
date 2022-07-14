import { EDGES_FILE_PATH } from '../constants';
import db from '../database';
const copyTo = require('pg-copy-streams').to;
// console.log(db);
export default async function exportCSV() {
  return new Promise((resolve, reject) => {
    db.connectionManager.getConnection().then((client) => {
      let data = '';
      const stream = client.query(
        copyTo(
          `COPY  edges ("from",  "to", "token", "capacity") TO '${EDGES_FILE_PATH}' WITH (FORMAT CSV)`,
        ),
      );
      stream.setEncoding('utf8');
      stream.on('error', (err) => {
        db.connectionManager.releaseConnection(client);
        reject(err);
      });
      stream.on('end', () => {
        db.connectionManager.releaseConnection(client);
        resolve(data);
      });
      stream.on('data', (chunk) => (data += chunk));
    });
  });
}
