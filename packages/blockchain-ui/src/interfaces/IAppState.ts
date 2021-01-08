import ITutorialObject from './ITutorialObject';
import ISmartContract from './ISmartContract';
import IAssociatedTxdata from './IAssociatedTxdata';
import ITransaction from './ITransaction';
import IRepositoryObject from './IRepositoryObject';
import IPackageRegistryEntry from './IPackageRegistryEntry';

export interface IDeployData {
    channelName: string;
    hasV1Capabilities: boolean;
    environmentName: string;
    packageEntries: IPackageRegistryEntry[];
    workspaceNames: string[];
    selectedPackage: IPackageRegistryEntry | undefined;
    selectedWorkspace: string | undefined;
    chosenWorkspaceData: {
        language: string,
        name: string,
        version: string,
    };
    committedDefinitions: string[];
    environmentPeers: string[];
    discoveredPeers: string[];
    orgMap: any;
    orgApprovals: any;
}

export interface ITutorialData {
    name: string;
    tutorials: ITutorialObject[];
    tutorialFolder: string;
    tutorialDescription?: string;
}

export interface IRepositoryData {
    repositories: IRepositoryObject[];
}

export interface ITransactionViewData {
    gatewayName: string;
    smartContracts: ISmartContract[];
    preselectedSmartContract: ISmartContract;
    associatedTxdata: IAssociatedTxdata;
    preselectedTransaction: ITransaction;
}

interface IAppState {
    redirectPath: string;
    extensionVersion: string;
    deployData: IDeployData;
    tutorialData: ITutorialData[];
    activeTutorial: ITutorialObject;
    repositoryData: IRepositoryData;
    transactionViewData: ITransactionViewData;
    transactionOutput: string;
}

export default IAppState;
