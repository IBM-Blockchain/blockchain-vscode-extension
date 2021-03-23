import React, { Component } from 'react';
import HeadingCombo from '../../elements/HeadingCombo/HeadingCombo';
import './DeployPage.scss';
import ButtonList from '../../elements/ButtonList/ButtonList';
import DeployProgressBar from '../../elements/DeployProgressBar/DeployProgressBar';
import IPackageRegistryEntry from '../../../interfaces/IPackageRegistryEntry';
import DeployStepOne from '../../elements/DeploySteps/DeployStepOne/DeployStepOne';
import DeployStepTwo from '../../elements/DeploySteps/DeployStepTwo/DeployStepTwo';
import DeployStepThree from '../../elements/DeploySteps/DeployStepThree/DeployStepThree';
import Utils from '../../../Utils';
interface IProps {
    deployData: { channelName: string, hasV1Capabilities: boolean, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined, selectedWorkspace: string | undefined, chosenWorkspaceData: { language: string, name: string, version: string }, committedDefinitions: string[], environmentPeers: string[], discoveredPeers: string[], orgMap: any, orgApprovals: any };
}

interface DeployState {
    progressIndex: number;
    environmentName: string;
    channelName: string;
    hasV1Capabilities: boolean;
    selectedPackage: IPackageRegistryEntry | undefined;
    chosenWorkspaceData: { language: string, name: string, version: string };
    selectedWorkspace: string | undefined;
    selectedPeers: string[];
    definitionName: string;
    definitionVersion: string;
    disableNext: boolean;
    nameInvalid: boolean;
    versionInvalid: boolean;
    commitSmartContract: boolean | undefined;
    deletedSelectedPackage: boolean;
    currentCollectionFile: File | undefined;
    endorsementPolicy: string | undefined;
    orgApprovals: any;
    environmentPeers: string[];
    discoveredPeers: string[];
    orgMap: any;
    instantiateFunctionName: string;
    instantiateFunctionArgs: string;
}

class DeployPage extends Component<IProps, DeployState> {

    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            progressIndex: 0,
            environmentName: this.props.deployData.environmentName,
            channelName: this.props.deployData.channelName,
            hasV1Capabilities: this.props.deployData.hasV1Capabilities,
            selectedPackage: this.props.deployData.selectedPackage ? this.props.deployData.selectedPackage : undefined,
            chosenWorkspaceData: this.props.deployData.chosenWorkspaceData,
            selectedPeers: this.props.deployData.discoveredPeers,
            selectedWorkspace: this.props.deployData.selectedWorkspace,
            currentCollectionFile: undefined,
            definitionName: '',
            definitionVersion: '',
            disableNext: true,
            nameInvalid: false,
            versionInvalid: false,
            endorsementPolicy: undefined,
            orgApprovals: undefined,
            orgMap: this.props.deployData.orgMap,
            environmentPeers: this.props.deployData.environmentPeers,
            discoveredPeers: this.props.deployData.discoveredPeers,
            commitSmartContract: undefined, // If undefined, we'll assume the user wants to commit (but they haven't specified)
            deletedSelectedPackage: false, // Has the user deleted the package they've selected whilst on step two or three?
            instantiateFunctionName: '',
            instantiateFunctionArgs: ''
        };

        this.handleProgressChange = this.handleProgressChange.bind(this);
        this.handlePackageChange = this.handlePackageChange.bind(this);
        this.handleDefinitionNameChange = this.handleDefinitionNameChange.bind(this);
        this.handleDefinitionVersionChange = this.handleDefinitionVersionChange.bind(this);
        this.handleCommitChange = this.handleCommitChange.bind(this);
        this.handleDeploy = this.handleDeploy.bind(this);
        this.handlePackageWorkspace = this.handlePackageWorkspace.bind(this);
        this.handleCollectionChange = this.handleCollectionChange.bind(this);
        this.handleEndorsementPolicyChange = this.handleEndorsementPolicyChange.bind(this);
        this.handlePeerChange = this.handlePeerChange.bind(this);
        this.handleGetOrgApprovals = this.handleGetOrgApprovals.bind(this);
        this.handleInstantiateFunctionNameChange = this.handleInstantiateFunctionNameChange.bind(this);
        this.handleInstantiateFunctionArgsChange = this.handleInstantiateFunctionArgsChange.bind(this);
        this.handleEnableOrDisableNext = this.handleEnableOrDisableNext.bind(this);
    }

    componentWillReceiveProps(props: any): void {
        if (this.state.selectedPackage) {
            const entry: IPackageRegistryEntry = props.deployData.packageEntries.find((_entry: IPackageRegistryEntry) => {
                return ((this.state.selectedPackage as IPackageRegistryEntry).version && _entry.name === (this.state.selectedPackage as IPackageRegistryEntry).name && _entry.version === (this.state.selectedPackage as IPackageRegistryEntry).version) || (!(this.state.selectedPackage as IPackageRegistryEntry).version && _entry.name === (this.state.selectedPackage as IPackageRegistryEntry).name);
            });

            if (!entry && this.state.progressIndex > 0) {
                // If the user has deleted the package in Step Two or Three - go back to Step One and show warning.
                this.setState({ progressIndex: 0, selectedPackage: undefined, disableNext: true, deletedSelectedPackage: true });
            }
        }

        if (props.deployData.selectedPackage) {
            // If a new selected package is passed
            this.setState({ selectedPackage: props.deployData.selectedPackage, definitionName: props.deployData.selectedPackage.name, definitionVersion: props.deployData.selectedPackage.version ? props.deployData.selectedPackage.version : '0.0.1', disableNext: false });
        }

        if (props.deployData.orgApprovals) {
            this.setState({ orgApprovals: props.deployData.orgApprovals });
        }

    }

    componentDidUpdate(prevProps: any): void {
        if (prevProps.deployData.chosenWorkspaceData !== this.props.deployData.chosenWorkspaceData) {
            this.setState({
                chosenWorkspaceData: this.props.deployData.chosenWorkspaceData
            });
        }
    }

    handleProgressChange(indexValue: number): void {
        const newState: any = { progressIndex: indexValue };

        if (newState.progressIndex === 0 && this.state.selectedPackage) {
            newState.disableNext = false;
        }

        this.setState(newState);
    }

    handlePackageChange(selectedPackage: IPackageRegistryEntry | undefined, workspaceName?: string): void {
        if (!selectedPackage && workspaceName) {
            Utils.postToVSCode({
                command: 'getPackageLanguage',
                data: { workspaceName }
            });
            // Selected a workspace name
            this.setState({ selectedPackage: undefined, disableNext: true, selectedWorkspace: workspaceName, deletedSelectedPackage: false });
        } else if (selectedPackage && !workspaceName) {
            // Selected a package

            // If the user selects a package without a version, default to using '0.0.1'
            const newVersion: string = selectedPackage.version ? selectedPackage.version : '0.0.1';

            this.setState({ selectedPackage, selectedWorkspace: undefined, definitionName: selectedPackage.name, definitionVersion: newVersion, disableNext: false, deletedSelectedPackage: false }); // Reset definition name and version back to default.
        } else {
            // User probably deleted the selected package or workspace.
            this.setState({ selectedPackage: undefined, selectedWorkspace: undefined, disableNext: true });

        }
    }

    handleDefinitionNameChange(definitionName: string, nameInvalid: boolean): void {
        let disableNext: boolean = false;
        if (nameInvalid || this.state.versionInvalid) {
            disableNext = true;
        }

        // Disable Next button if name is undefined
        this.setState({ definitionName, disableNext, nameInvalid });
    }
    handleDefinitionVersionChange(definitionVersion: string, versionInvalid: boolean): void {
        let disableNext: boolean = false;
        if (versionInvalid || this.state.nameInvalid) {
            disableNext = true;
        }

        // Disable Next button if version is undefined
        this.setState({ definitionVersion, disableNext, versionInvalid });
    }

    handleCommitChange(value: boolean): void {
        this.setState({ commitSmartContract: value });
    }

    handlePackageWorkspace(workspaceName: string, packageName: string, packageVersion: string): void {

        Utils.postToVSCode({
            command: 'package',
            data: {
                workspaceName,
                packageName,
                packageVersion,
                versionNumber: this.state.hasV1Capabilities === true ? 1 : 2
            }
        });
    }

    async handleGetOrgApprovals(): Promise<void> {
        const collectionConfig: string = this.state.currentCollectionFile ? await Utils.readFileAsync(this.state.currentCollectionFile) : '';

        Utils.postToVSCode({
            command: 'getOrgApprovals',
            data: {
                environmentName: this.state.environmentName,
                channelName: this.state.channelName,
                definitionName: this.state.definitionName,
                definitionVersion: this.state.definitionVersion,
                collectionConfig,
                endorsementPolicy: this.state.endorsementPolicy
            }
        });
    }

    async handleDeploy(): Promise<void> {
        const collectionConfig: string = this.state.currentCollectionFile ? await Utils.readFileAsync(this.state.currentCollectionFile) : '';

        if (this.state.hasV1Capabilities) {
            const command: string = (this.props.deployData.committedDefinitions.find((entry: string) => entry.includes(`${this.state.definitionName}@`))) ? 'upgrade' : 'instantiate';
            Utils.postToVSCode({
                command,
                data: {
                    channelName: this.state.channelName,
                    selectedPeers: this.state.selectedPeers,
                    environmentName: this.state.environmentName,
                    selectedPackage: this.state.selectedPackage,
                    instantiateFunctionName: this.state.instantiateFunctionName,
                    instantiateFunctionArgs: this.state.instantiateFunctionArgs,
                    collectionConfig,
                    endorsementPolicy: this.state.endorsementPolicy ? this.state.endorsementPolicy : undefined,
                }
            });
        } else {
            Utils.postToVSCode({
                command: 'deploy',
                data: {
                    environmentName: this.state.environmentName,
                    channelName: this.state.channelName,
                    selectedPackage: this.state.selectedPackage,
                    definitionName: this.state.definitionName,
                    definitionVersion: this.state.definitionVersion,
                    commitSmartContract: this.state.commitSmartContract,
                    collectionConfig,
                    endorsementPolicy: this.state.endorsementPolicy ? this.state.endorsementPolicy : undefined,
                    selectedPeers: this.state.selectedPeers
                }
            });
        }
    }

    handleCollectionChange(file: File): void {
        this.setState({ currentCollectionFile: file });
    }

    handleEndorsementPolicyChange(policy: string): void {
        this.setState({ endorsementPolicy: policy });
    }

    handlePeerChange(peers: string[]): void {
        this.setState({ selectedPeers: peers });
    }

    handleInstantiateFunctionNameChange(value: string): void {
        this.setState({
            instantiateFunctionName: value
        });
    }

    handleInstantiateFunctionArgsChange(value: string): void {
        this.setState({
            instantiateFunctionArgs: value
        });
    }

    handleEnableOrDisableNext(value: boolean): void {
        if (this.state.disableNext !== value) {
            this.setState({
                disableNext: value
            });
        }
    }

    render(): JSX.Element {

        const subHeadingString: string = `Deploying to ${this.state.channelName} in ${this.state.environmentName}`;

        const currentIndex: number = this.state.progressIndex;

        let currentStepComponent: any;
        // Render components depending on the progress / step.
        if (currentIndex === 0) {
            currentStepComponent = <DeployStepOne hasV1Capabilities={this.state.hasV1Capabilities} packageEntries={this.props.deployData.packageEntries} selectedPackage={this.state.selectedPackage} chosenWorkspaceData={this.state.chosenWorkspaceData} workspaceNames={this.props.deployData.workspaceNames} selectedWorkspace={this.state.selectedWorkspace} deletedSelectedPackage={this.state.deletedSelectedPackage} onPackageChange={this.handlePackageChange} onPackageWorkspace={this.handlePackageWorkspace} />;
        } else if (currentIndex === 1) {
            currentStepComponent = <DeployStepTwo hasV1Capabilities={this.state.hasV1Capabilities} committedDefinitions={this.props.deployData.committedDefinitions} currentCollectionFile={this.state.currentCollectionFile} endorsementPolicy={this.state.endorsementPolicy} onCollectionChange={this.handleCollectionChange} onEndorsementPolicyChange={this.handleEndorsementPolicyChange} selectedPackage={this.state.selectedPackage as IPackageRegistryEntry} currentDefinitionName={this.state.definitionName} currentDefinitionVersion={this.state.definitionVersion} onDefinitionNameChange={this.handleDefinitionNameChange} onDefinitionVersionChange={this.handleDefinitionVersionChange} enableOrDisableNext={this.handleEnableOrDisableNext}/>;
        } else {
            currentStepComponent = <DeployStepThree hasV1Capabilities={this.state.hasV1Capabilities} committedDefinitions={this.props.deployData.committedDefinitions} environmentPeers={this.state.environmentPeers} discoveredPeers={this.state.discoveredPeers} orgMap={this.state.orgMap} orgApprovals={this.state.orgApprovals} selectedPackage={this.state.selectedPackage as IPackageRegistryEntry} channelName={this.state.channelName} commitSmartContract={this.state.commitSmartContract} selectedPeers={this.state.selectedPeers} onGetOrgApproval={this.handleGetOrgApprovals} onPeerChange={this.handlePeerChange} onCommitChange={this.handleCommitChange} onInstantiateFunctionNameChange={this.handleInstantiateFunctionNameChange} onInstantiateFunctionArgsChange={this.handleInstantiateFunctionArgsChange}/>;
        }

        return (
            <div className='bx--grid deploy-page-container'>
                <div className='bx--row'>
                    <div className='bx--col-lg-10'>
                        <HeadingCombo
                            headingText='Deploy smart contract'
                            subheadingText={subHeadingString}
                        />
                    </div>
                    <div className='bx--col-lg-4'>
                        <ButtonList onDeployClicked={this.handleDeploy} onProgressChange={this.handleProgressChange} currentIndex={this.state.progressIndex} disableNext={this.state.disableNext} />
                    </div>
                    <div className='bx--col-lg-2'></div>
                </div>
                <div className='bx--row progress-row'>
                    <DeployProgressBar currentIndex={this.state.progressIndex} hasV1Capabilities={this.state.hasV1Capabilities}/>
                </div>

                {currentStepComponent}

            </div>

        );
    }
}

export default DeployPage;
