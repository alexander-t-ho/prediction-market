// Quick test to check if /api/markets works with empty database
const fetch = require('node-fetch');

async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/markets?sort=newest');
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
