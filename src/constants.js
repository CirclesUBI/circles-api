import path from 'path';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const EDGES_DIRECTORY_NAME = 'edges-data';
export const EDGES_FILE_PATH = path.join(
  '..',
  EDGES_DIRECTORY_NAME,
  'edges.json',
);

export const PATHFINDER_FILE_PATH = path.join('..', 'pathfinder');
