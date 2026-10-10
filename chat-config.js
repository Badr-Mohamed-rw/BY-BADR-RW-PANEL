/* chat-config.js — токен в base64 */
const B = 'Z2l0aHViX3BhdF8xMUNDRVBNNVkwbWhaYkh2SjFSQTBzX3QyUTVDOEZIUlN5Y2F2d1pHQ3gwS0F0Q1Z1Y2JhcFNlS0NJRVFBR1huZksySkhUN0NTV0w3Y3RMYU9l';

function dec(s) {
    return Buffer.from(s, 'base64').toString('utf8');
}

module.exports = {
    GITHUB_TOKEN: dec(B),
    GITHUB_OWNER: 'Badr-Mohamed-rw',
    GITHUB_REPO:  'nexo-storage',
    JWT_SECRET:   'nexo-super-secret-1234567890',
    ADMIN_EMAIL:  'ahmedesmail7978@gmail.com'
};
