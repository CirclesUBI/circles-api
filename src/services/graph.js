import core from './core';

const PAGINATION_SIZE = 500;

async function fetchFromGraph(
  name,
  fields,
  extra = '',
  skip = 0,
  first = PAGINATION_SIZE,
) {
  const query = `{
    ${name}(${extra} first: ${first}, skip: ${skip}) {
      ${fields}
    }
  }`;

  const data = await core.utils.requestGraph({ query });
  return data[name];
}

async function* fetchGraphGenerator(name, fields, extra = '') {
  let skip = 0;
  let hasData = true;

  while (hasData) {
    const data = await fetchFromGraph(name, fields, extra, skip);
    hasData = data.length > 0;
    skip += PAGINATION_SIZE;
    yield data;
  }
}

export default async function fetchAllFromGraph(name, fields, extra = '') {
  let result = [];
  let index = 0;

  for await (let data of fetchGraphGenerator(name, fields, extra)) {
    result = result.concat(
      data.map((entry) => {
        entry.index = ++index;
        return entry;
      }),
    );
  }

  return result;
}
