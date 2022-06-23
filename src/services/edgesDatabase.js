import Edge from '../models/edges';

export async function upsertEdge(edge) {
  if (edge.capacity.toString() === '0') {
    return destroyEdge(edge);
  } else {
    return Edge.upsert(edge, {
      where: {
        token: edge.token,
        from: edge.from,
        to: edge.to,
      },
    });
  }
}

export async function destroyEdge(edge) {
  return Edge.destroy({
    where: {
      token: edge.token,
      from: edge.from,
      to: edge.to,
    },
  });
}

export async function queryEdges(where) {
  return await Edge.findAll({
    where,
    order: [['from', 'ASC']],
    raw: true,
  });
}

export async function getStoredEdges({ hasOnlyFileFields = false } = {}) {
  return await Edge.findAll({
    attributes: hasOnlyFileFields ? ['from', 'to', 'token', 'capacity'] : null,
    order: [['from', 'ASC']],
    raw: true,
  });
}
Number.toString(2);
