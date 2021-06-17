import cleanup from './cleanup';
import exportEdges from './exportEdges';
import syncAddress from './syncAddress';
import syncFullGraph from './syncFullGraph';
import uploadEdgesS3 from './uploadEdgesS3';

export const allTasks = [
  cleanup,
  exportEdges,
  syncAddress,
  syncFullGraph,
  uploadEdgesS3,
];

export default {
  cleanup,
  exportEdges,
  syncAddress,
  syncFullGraph,
  uploadEdgesS3,
};
