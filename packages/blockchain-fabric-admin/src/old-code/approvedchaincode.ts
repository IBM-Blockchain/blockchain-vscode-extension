/**
 * Copyright 2020 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore no implicit any
import {
	Endorser,
} from 'fabric-common';

import {
	Lifecycle,
} from './lifecycle';
import { ChaincodeUtils } from './chaincodeutils';

export class ApprovedChaincodeImpl implements Lifecycle.ApprovedChaincode {
	public chaincodeName: string;
	public chaincodeVersion: string;
	public label: string;
	public packageId: string;
	public sequence: number;
	public endorsementPolicy?: string | object | Buffer;
	public collectionConfig?: object;
	public initRequired?: boolean;
	public endorsementPlugin?: string;
	public validationPlugin?: string;

	public committed: boolean;

	public constructor(attributes: Lifecycle.ApprovedChaincodeAttributes) {
		this.chaincodeName = attributes.chaincodeName;
		this.chaincodeVersion= attributes.chaincodeVersion;
		this.label = attributes.label;
		this.packageId = attributes.packageId;
		this.sequence = attributes.sequence;
		this.endorsementPolicy = attributes.endorsementPolicy;
		this.collectionConfig = attributes.collectionConfig;
		this.initRequired = attributes.initRequired;
		this.endorsementPlugin = attributes.endorsementPlugin;
		this.validationPlugin = attributes.validationPlugin;

		this.committed = false;
	}

	public async commit(options: Lifecycle.CommittingOptions): Promise<void> {
		// use the utility to commit this approved packaged
		await ChaincodeUtils.commitPackage(this, options);
		this.committed = true;
	}

	public isCommitted(): boolean {
		return this.committed;
	}

	public checkCommitReadiness(options: Lifecycle.CommittingOptions): boolean {
		//
		return true;
	}
}