/**
 * Copyright 2020 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore no implicit any
import {Network} from 'fabric-network';
import {
    Lifecycle
} from './lifecycle';
import {
    ChaincodeUtils
} from './chaincodeutils'

export class PackagedChaincodeImpl implements Lifecycle.PackagedChaincode {
    public chaincodeName: string;
    public chaincodeVersion: string;
    public packageFile: Buffer;
    public label: string;

    public constructor(options: Lifecycle.PackagedChaincodeAttributes) {
        this.chaincodeName = options.chaincodeName;
        this.chaincodeVersion = options.chaincodeVersion;
        this.packageFile = options.packageFile;
        this.label = options.label;
    }

    public async install(options: Lifecycle.InstallingOptions): Promise<Lifecycle.InstalledChaincode> {
        // use the utility to install this package on the peers
        const packageId: string = await ChaincodeUtils.installPackage(this, options);

        // now build the object to return the results
        const installedattributes: Lifecycle.InstalledChaincodeAttributes = {
            chaincodeName: this.chaincodeName,
            chaincodeVersion: this.chaincodeVersion,
            label: this.label,
            packageId: packageId
        };

        return Lifecycle.newInstalledChaincode(installedattributes);
    }

}
