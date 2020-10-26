import cleanup from './cleanup';
import syncAddress from './syncAddress';
import syncFullGraph from './syncFullGraph';

export const allTasks = [cleanup, syncAddress, syncFullGraph];

export default {
  cleanup,
  syncAddress,
  syncFullGraph,
};
