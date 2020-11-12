const web3 = require('web3');

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Convert `capacity` field in `edges` table from number (in Ether) to
      // String (in Wei)
      const result = await queryInterface.sequelize.query(
        'SELECT id, capacity FROM edges;',
        {
          transaction,
        },
      );
      const edges = result[1].rows;

      await queryInterface.sequelize.query(
        'ALTER TABLE edges ADD COLUMN capacity_tmp VARCHAR(255);',
        {
          transaction,
        },
      );

      if (edges.length > 0) {
        await Promise.all(
          edges.map((edge) => {
            return queryInterface.sequelize.query(
              `UPDATE edges SET capacity_tmp = '${web3.utils.toWei(
                edge.capacity.toString(),
                'ether',
              )}' WHERE id = ${edge.id};`,
              {
                transaction,
              },
            );
          }),
        );
      }

      await queryInterface.sequelize.query(
        'ALTER TABLE edges DROP COLUMN IF EXISTS capacity RESTRICT;',
        {
          transaction,
        },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE edges RENAME COLUMN capacity_tmp TO capacity;',
        {
          transaction,
        },
      );

      await transaction.commit();
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  },
  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Convert `capacity` field in `edges` table from string (in Wei) to
      // number (in ether)
      const result = await queryInterface.sequelize.query(
        'SELECT id, capacity FROM edges;',
        {
          transaction,
        },
      );

      const edges = result[1].rows;

      await queryInterface.sequelize.query(
        'ALTER TABLE edges ADD COLUMN capacity_tmp INTEGER;',
        {
          transaction,
        },
      );

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
              {
                transaction,
              },
            );
          }),
        );
      }

      await queryInterface.sequelize.query(
        'ALTER TABLE edges DROP COLUMN IF EXISTS capacity RESTRICT;',
        {
          transaction,
        },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE edges RENAME COLUMN capacity_tmp TO capacity;',
        {
          transaction,
        },
      );

      await transaction.commit();
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  },
};
