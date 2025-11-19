import core from './core';

export async function requestGraph(query) {
  // Strip newlines in query before doing request
  return await core.utils.requestGraph({
    query: query.replace(/(\r\n|\n|\r)/gm, ' '),
  });
}
