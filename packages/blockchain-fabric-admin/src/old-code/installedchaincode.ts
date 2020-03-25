/**
 * Copyright 2020 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore no implicit any

import {
	 Lifecycle,
} from './lifecycle';
import { ChaincodeUtils } from './chaincodeutils';

export class InstalledChaincodeImpl implements Lifecycle.InstalledChaincode {
	public chaincodeName: string;
	public chaincodeVersion: string;
	public label: string;
	public packageFile?: Buffer;
	public packageId: string;

	public constructor(attributes: Lifecycle.InstalledChaincodeAttributes) {
		this.chaincodeName = attributes.chaincodeName;
		this.chaincodeVersion = attributes.chaincodeVersion;
		this.label = attributes.label;
		this.packageFile = attributes.packageFile;
		this.packageId = attributes.packageId;
	}

	public async approve(options: Lifecycle.ApprovingOptions): Promise<Lifecycle.ApprovedChaincode> {
		// use the utility to approve this installed package for this organization
		// each organization must approve the package
		if(!options.peerNames) {
			options.peerNames = [];
		}

		await ChaincodeUtils.approvePackage(this, options);

		// now build the object to return the results
		// in this case approve only returns success, so we have all we need
		// from 'this' and the passed in options
		const approvedAttributes: Lifecycle.ApprovedChaincodeAttributes = {
			chaincodeName: this.chaincodeName,
			chaincodeVersion: this.chaincodeVersion,
			packageFile: this.packageFile,
			label: this.label,
			packageId: this.packageId,
			sequence: options.sequence,
			endorsementPolicy: options.endorsementPolicy,
			collectionConfig: options.collectionConfig,
			initRequired: options.initRequired,
			endorsementPlugin: options.endorsementPlugin,
			validationPlugin: options.validationPlugin
		};

		return Lifecycle.newApprovedChaincode(approvedAttributes);
	}
}
