import fetch from 'isomorphic-fetch';

// fetch(process.env.API_SERVICE_ENDPOINT + '/api')
//   .then(function (response) {
//     if (response.status >= 400) {
//       throw new Error('Bad response from server');
//     }
//     return response.json();
//   })
//   .then(function (endpoint) {
//     console.log(endpoint);
//     return endpoint;
//   });

export default async function getGraphEndpointFromAPI() {
  return await fetch(process.env.API_SERVICE_ENDPOINT + '/api')
    .then((response) => {
      if (response.status >= 400) {
        throw new Error('Bad response from server');
      }
      return response.json();
    })
    .then((response) => {
      return response;
    });
}
// getGraphEndpointFromAPI().then((result) => console.log(result));
