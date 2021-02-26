import path from 'path';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const PATHFINDER_BASE_PATH = path.join(__dirname, '..', 'pathfinder');
export const EDGES_FILE_PATH = path.join(
  PATHFINDER_BASE_PATH,
  `edges-${process.env.NODE_ENV}.json`,
);
export const PATHFINDER_FILE_PATH = path.join(
  PATHFINDER_BASE_PATH,
  'pathfinder',
);
