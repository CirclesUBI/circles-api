import path from 'path';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const BASE_PATH = path.join(__dirname, '..');
export const EDGES_DIRECTORY_PATH = path.join(BASE_PATH, 'edges-data');
export const EDGES_FILE_PATH = path.join(EDGES_DIRECTORY_PATH, 'edges.csv');
export const PATHFINDER_FILE_PATH = path.join(BASE_PATH, 'pathfinder');

export const HOPS_DEFAULT = '3';
