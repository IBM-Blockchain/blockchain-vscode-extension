/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const adminIdentityMspPath = path.resolve(__dirname, 'admin-msp');
const adminIdentityCertificatePath = path.resolve(adminIdentityMspPath, 'signcerts', 'cert.pem');
const adminIdentityKeystorePath = path.resolve(adminIdentityMspPath, 'keystore');
const adminIdentityKeyPath = fs.readdirSync(adminIdentityKeystorePath).filter(key => !key.startsWith('.')).map(key => path.resolve(adminIdentityKeystorePath, key))[0];
const adminIdentity = {
    name: 'admin',
    certificate: fs.readFileSync(adminIdentityCertificatePath, 'base64'),
    private_key: fs.readFileSync(adminIdentityKeyPath, 'base64'),
    msp_id: 'Org1MSP'
};

const identities = [
    adminIdentity
];

for (const identity of identities) {
    const identityPath = path.resolve(__dirname, 'wallets', 'local_wallet', `${identity.name}.json`);
    const identityData = JSON.stringify(identity, null, 4);
    fs.writeFileSync(identityPath, identityData);
}
