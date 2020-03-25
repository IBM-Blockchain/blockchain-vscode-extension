/**
 * Copyright 2020 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore no implicit any

import {
    Network,
    Gateway,
} from 'fabric-network';

import {ChaincodeSourceImpl} from './chaincodesource';
import {PackagedChaincodeImpl} from './chaincodepackage';
import {InstalledChaincodeImpl} from './installedchaincode';
import {ApprovedChaincodeImpl} from './approvedchaincode';
import {ChaincodeUtils} from './chaincodeutils';

// tslint:disable-next-line:no-namespace
export namespace Lifecycle {
    // --------- query a peer for an installed chaincode
    export async function queryInstalledChaincode(options: QueryInstalledChaincodeOptions): Promise<InstalledChannelChaincodeAttributes[]> {
        return await ChaincodeUtils.queryInstalledChaincode(options);
    }

    export interface QueryInstalledChaincodeOptions {
        network: Network;
        peerName: string;
        timeout?: number;
        packageId: string;
    }

    export interface InstalledChannelChaincodeAttributes {
        channelName: string;
        chaincodeName: string;
        chaincodeVersion: string;
        label: string;
        packageId: string;
    }

    // --------- query a peer for ALL installed chaincodes
    export async function queryAllInstalledChaincodes(options: QueryAllInstalledChaincodesOptions): Promise<InstalledChannelChaincodeAttributes[]> {
        return await ChaincodeUtils.queryAllInstalledChaincodes(options);
    }

    export interface QueryAllInstalledChaincodesOptions {
        network: Network;
        peerName: string;
        timeout?: number;
    }

    // --------- query for the installed package file
    export async function queryInstalledChaincodePackageFile(options: QueryInstalledChaincodePackageFileOptions): Promise<Buffer> {
        return await ChaincodeUtils.queryInstalledChaincodePackageFile(options);
    }

    export interface QueryInstalledChaincodePackageFileOptions {
        network: Network;
        peerName: string;
        timeout?: number;
        packageId: string;
    }

    // --------- query a peer for a defined chaincode with it's approvals
    export function queryDefinedChaincode(options: QueryDefinedChaincodeOptions): Promise<DefinedChaincodeAttributes> {
        return ChaincodeUtils.queryDefinedChaincode(options);
    }

    export interface QueryDefinedChaincodeOptions {
        network: Network;
        peerName: string;
        timeout?: number;
        chaincodeName: string;
    }

    export interface DefinedChaincodeApprovalsAttributes {
        chaincodeName: string;
        chaincodeVersion: string;
        sequence: number;
        endorsementPolicy?: string | object | Buffer;
        collectionConfig?: object | Buffer;
        initRequired?: boolean;
        endorsementPlugin?: string;
        validationPlugin?: string;
        approvals: Map<string, boolean>;
    }

    // --------- query a peer for all defined chaincodes
    export function queryDefinedChaincodes(options: QueryDefinedChaincodesOptions): Promise<DefinedChaincodeAttributes[]> {
        return ChaincodeUtils.queryDefinedChaincodes(options);
    }

    export interface QueryDefinedChaincodesOptions {
        network: Network;
        peerName: string;
        timeout?: number;
    }

    export interface DefinedChaincodeAttributes {
        chaincodeName: string;
        chaincodeVersion: string;
        sequence: number;
        endorsementPolicy?: string | object | Buffer;
        collectionConfig?: object | Buffer;
        initRequired?: boolean;
        endorsementPlugin?: string;
        validationPlugin?: string;
    }

    // --------- query a peer for a definition's commit readiness
    export function queryCommitReadiness(options: QueryCommitReadinessOptions): Promise<Map<string, boolean>> {
        return ChaincodeUtils.queryCommitReadiness(options);
    }

    export interface QueryCommitReadinessOptions {
        chaincodeName: string;
        chaincodeVersion: string;
        sequence: number;
        endorsementPolicy?: string | object | Buffer;
        collectionConfig?: object | Buffer;
        initRequired?: boolean;
        endorsementPlugin?: string;
        validationPlugin?: string;
        network: Network;
        peerName: string;
        timeout?: number;
    }

    // --------- source
    export function newChaincodeSource(options: ChaincodeSourceAttributes): ChaincodeSource {
        return new ChaincodeSourceImpl(options);
    }

    export interface ChaincodeSourceAttributes {
        chaincodeName: string;
        chaincodeVersion: string;
    }

    // --------- package
    export interface ChaincodeSource extends ChaincodeSourceAttributes {
        package(options: PackagingOptions): Promise<PackagedChaincode>;
    }

    export interface PackagingOptions {
        chaincodePath: string;
        metadataPath?: string;
        golangPath?: string;
        chaincodeType: string;
        label: string;
    }

    export interface QueryPackagedChaincodeOptions {
        gateway: Gateway;
        peerName: string;
        timeout: number;
        packageId: string;
    }

    export function newPackagedChaincode(options: PackagedChaincodeAttributes): PackagedChaincode {
        return new PackagedChaincodeImpl(options);
    }

    // --------- install
    export interface PackagedChaincode extends PackagedChaincodeAttributes {
        install(options: InstallingOptions): Promise<InstalledChaincode>;
    }

    export interface PackagedChaincodeAttributes {
        chaincodeName: string;
        chaincodeVersion: string;
        packageFile: Buffer;
        label: string;
    }

    export interface InstallingOptions {
        network: Network;
        peerNames: string[];
        timeout?: number;
    }

    export function newInstalledChaincode(options: InstalledChaincodeAttributes): InstalledChaincode {
        return new InstalledChaincodeImpl(options);
    }

    // ---------- approve
    export interface InstalledChaincode extends InstalledChaincodeAttributes {
        approve(options: ApprovingOptions): Promise<ApprovedChaincode>;
    }

    export interface InstalledChaincodeAttributes {
        chaincodeName: string;
        chaincodeVersion: string;
        packageFile?: Buffer;
        label: string;
        packageId: string;
    }

    export interface ApprovingOptions {
        sequence: number;
        endorsementPlugin?: string;
        validationPlugin?: string;
        endorsementPolicy?: string | object | Buffer;
        collectionConfig?: object | Buffer;
        initRequired?: boolean;
        network: Network;
        peerNames?: string[];
        timeout?: number;
    }

    export function newApprovedChaincode(options: ApprovedChaincodeAttributes): ApprovedChaincode {
        return new ApprovedChaincodeImpl(options);
    }

    // --------- commit
    export interface ApprovedChaincode extends ApprovedChaincodeAttributes {
        isCommitted(): boolean; // FIXME - do we need this
        commit(options: CommittingOptions): Promise<void>;
    }

    export interface ApprovedChaincodeAttributes {
        chaincodeName: string;
        chaincodeVersion: string;
        packageFile?: Buffer;
        label: string;
        packageId: string;
        sequence: number;
        endorsementPolicy?: string | object | Buffer;
        collectionConfig?: object | Buffer;
        initRequired?: boolean;
        endorsementPlugin?: string;
        validationPlugin?: string;
    }

    export interface CommittingOptions {
        network: Network;
        peerNames?: string[];
        timeout?: number;
    }
}
