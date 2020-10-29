import path from 'path';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const PATHFINDER_BASE_PATH = path.join(__dirname, '..', 'pathfinder');
export const EDGES_FILE_PATH = path.join(PATHFINDER_BASE_PATH, 'edges.json');
<<<<<<< HEAD
export const EDGES_TMP_FILE_PATH = path.join(
  PATHFINDER_BASE_PATH,
  'edges.json-tmp',
);
=======
>>>>>>> Refactor structure, move all into separate files
export const PATHFINDER_FILE_PATH = path.join(
  PATHFINDER_BASE_PATH,
  'pathfinder',
);
