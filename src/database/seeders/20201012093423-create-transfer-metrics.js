module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert(
      'metrics',
      [
        'countEdges',
        'countSafes',
        'countTokens',
        'edgesLastAdded',
        'edgesLastRemoved',
        'edgesLastUpdated',
        'lastBlockNumber',
        'lastUpdateAt',
        'lastUpdateDuration',
      ].map((name) => {
        return {
          category: 'transfers',
          name,
          value: 0,
        };
      }),
      {},
    );
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('metrics', null, {});
  },
};
