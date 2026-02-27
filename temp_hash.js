const https = require('https');
const crypto = require('crypto');

function getHash(url) {
    https.get(url, (res) => {
        const hash = crypto.createHash('sha384');
        res.on('data', chunk => hash.update(chunk));
        res.on('end', () => console.log(url + ': sha384-' + hash.digest('base64')));
    });
}
getHash('https://pyscript.net/releases/2024.1.1/core.js');
getHash('https://pyscript.net/releases/2024.1.1/core.css');
