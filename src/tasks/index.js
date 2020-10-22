import cleanup from './cleanup';
import exportEdges from './exportEdges';
import syncAddress from './syncAddress';
import syncFullGraph from './syncFullGraph';
<<<<<<< HEAD
import uploadEdgesS3 from './uploadEdgesS3';

export const allTasks = [
  cleanup,
  exportEdges,
  syncAddress,
  syncFullGraph,
  uploadEdgesS3,
];
=======
import nightlyCleanup from './nightlyCleanup';
>>>>>>> Move sync full graph into job, run it nightly

export default {
  cleanup,
  exportEdges,
  syncAddress,
  syncFullGraph,
<<<<<<< HEAD
  uploadEdgesS3,
};

=======
  nightlyCleanup,
}
>>>>>>> Move sync full graph into job, run it nightly
