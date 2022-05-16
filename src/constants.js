import path from 'path';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const BASE_PATH = path.join(__dirname, '..');
export const EDGES_DIRECTORY_PATH = path.join(BASE_PATH, 'edges-data');
export const EDGES_FILE_PATH = path.join(EDGES_DIRECTORY_PATH, 'edges.json');
export const PATHFINDER_FILE_PATH = path.join(BASE_PATH, 'pathfinder');
export const CONFIG_PATH = path.join(BASE_PATH, 'config.json');
