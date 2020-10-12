import Metric from '../models/metrics';

export async function setMetrics(category, metrics = []) {
  const promises = metrics.map(({ name, value }) => {
    return Metric.update(
      { value },
      {
        where: {
          category,
          name,
        },
      },
    );
  });

  return Promise.all(promises);
}

export async function getMetrics(category) {
  return Metric.findAll({
    where: {
      category,
    },
  }).then((response) => {
    return response.reduce((acc, item) => {
      acc[item.name] = parseInt(item.value, 10);
      return acc;
    }, {});
  });
}
