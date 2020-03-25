/**
 * Copyright 2020 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore no implicit any

import {
	Lifecycle
} from './lifecycle';
import {
	ChaincodeUtils
} from './chaincodeutils'

export class ChaincodeSourceImpl implements Lifecycle.ChaincodeSource {
	public chaincodeName: string;
	public chaincodeVersion: string;

	public constructor(options: Lifecycle.ChaincodeSourceAttributes) {
		this.chaincodeName = options.chaincodeName;
		this.chaincodeVersion = options.chaincodeVersion;
	}

	public async package(options: Lifecycle.PackagingOptions): Promise<Lifecycle.PackagedChaincode> {
		// use utility to package this chaincode package
		const packageFile = await ChaincodeUtils.packageChaincode(this, options);

		// now build the object to return the results
		const packagedAttribuites: Lifecycle.PackagedChaincodeAttributes = {
			chaincodeName: this.chaincodeName,
			chaincodeVersion: this.chaincodeVersion,
			packageFile: packageFile,
			label: options.label
		};

		return Lifecycle.newPackagedChaincode(packagedAttribuites);
	}

	public async queryPackagedChaincode(options: Lifecycle.QueryPackagedChaincodeOptions): Promise<Lifecycle.PackagedChaincode> {

		const packagedAttribuites: Lifecycle.PackagedChaincodeAttributes = {
			chaincodeName: this.chaincodeName,
			chaincodeVersion: this.chaincodeVersion,
			packageFile: Buffer.from('asdf'),
			label: 'fixme'
		};

		return Lifecycle.newPackagedChaincode(packagedAttribuites);
	}

}
