const { resolveRestaurantCoordinates, fetchSerpApiQuery } = require('./services/restaurantService');
const key = process.env.SERPAPI_API_KEY;
(async () => {
  const item = {
    title: 'Fat Mama',
    address: 'Kazinczy u. 24',
  };
  try {
    const resolved = await resolveRestaurantCoordinates({ restaurant: item, serpApiKey: key });
    console.log('resolved', resolved);
  } catch (err) {
    console.error('error', err);
  }
})();