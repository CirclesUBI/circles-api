const web3 = require('web3');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Convert `capacity` field in `edges` table from number (in Ether) to
    // String (in Wei)
    const result = await queryInterface.sequelize.query(
      'SELECT id, capacity FROM edges;',
    );
    const edges = result[1].rows;

    await queryInterface.addColumn('edges', 'capacity_tmp', {
      type: Sequelize.STRING,
    });

    if (edges.length > 0) {
      await Promise.all(
        edges.map((edge) => {
          return queryInterface.sequelize.query(
            `UPDATE edges SET capacity_tmp = '${web3.utils.toWei(
              edge.capacity.toString(),
              'ether',
            )}' WHERE id = ${edge.id};`,
          );
        }),
      );
    }

    await queryInterface.removeColumn('edges', 'capacity');
    await queryInterface.renameColumn('edges', 'capacity_tmp', 'capacity');
  },
  down: async (queryInterface, Sequelize) => {
    // Convert `capacity` field in `edges` table from string (in Wei) to
    // number (in ether)
    const result = await queryInterface.sequelize.query(
      'SELECT id, capacity FROM edges;',
    );

    const edges = result[1].rows;

    await queryInterface.addColumn('edges', 'capacity_tmp', {
      type: Sequelize.INTEGER,
    });

    if (edges.length > 0) {
      await Promise.all(
        edges.map((edge) => {
          return queryInterface.sequelize.query(
            `UPDATE edges SET capacity_tmp = ${Math.floor(
              parseFloat(
                web3.utils.fromWei(edge.capacity.toString(), 'ether'),
                10,
              ),
            )} WHERE id = ${edge.id};`,
          );
        }),
      );
    }

    await queryInterface.removeColumn('edges', 'capacity');
    await queryInterface.renameColumn('edges', 'capacity_tmp', 'capacity');
  },
};
