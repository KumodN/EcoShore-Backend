const crypto = require('crypto');

const generateRandomSixDigit = () => {
  return crypto.randomInt(100000, 1000000).toString(); // always 6 digits
};

module.exports = {
  generateRandomSixDigit,
};
