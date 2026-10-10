const B = 'Z2l0aHViX3BhdF8xMUNDRVBNNVkwRXhOZ0c1RkYzcGNPX1hSZU03cFg0YUdmbk1OMms1MEt1Q1lwOTVQc1hpUlRyclJBOGdROFZIT0FYUU9LRzNISVQ0dUg3aTdm';
function dec(s){return Buffer.from(s,'base64').toString('utf8');}
module.exports={
  GITHUB_TOKEN: dec(B),
  GITHUB_OWNER: 'Badr-Mohamed-rw',
  GITHUB_REPO:  'nexo-storage',
  JWT_SECRET:   'nexo-super-secret-1234567890',
  ADMIN_EMAIL:  'ahmedesmail7978@gmail.com'
};
