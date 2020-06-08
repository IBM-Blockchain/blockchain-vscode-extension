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
    deployData: {channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined, definitionNames: string[]};
}

interface DeployState {
    progressIndex: number;
    environmentName: string;
    channelName: string;
    selectedPackage: IPackageRegistryEntry | undefined;
    selectedWorkspace: string | undefined;
    definitionName: string;
    definitionVersion: string;
    disableNext: boolean;
    nameInvalid: boolean;
    versionInvalid: boolean;
    commitSmartContract: boolean | undefined;
    deletedSelectedPackage: boolean;
    currentCollectionFile: File | undefined;
    endorsementPolicy: string | undefined;
}

class DeployPage extends Component<IProps, DeployState> {

    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            progressIndex: 0,
            environmentName: this.props.deployData.environmentName,
            channelName: this.props.deployData.channelName,
            selectedPackage: this.props.deployData.selectedPackage ? this.props.deployData.selectedPackage : undefined,
            selectedWorkspace: undefined,
            currentCollectionFile: undefined,
            definitionName: '',
            definitionVersion: '',
            disableNext: true,
            nameInvalid: false,
            versionInvalid: false,
            endorsementPolicy: undefined,
            commitSmartContract: undefined, // If undefined, we'll assume the user wants to commit (but they haven't specified)
            deletedSelectedPackage: false // Has the user deleted the package they've selected whilst on step two or three?
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
    }

    handleProgressChange(indexValue: number): void {
        const newState: any = {progressIndex: indexValue};

        if (newState.progressIndex === 0 && this.state.selectedPackage) {
            newState.disableNext = false;
        }

        this.setState(newState);
    }

    handlePackageChange(selectedPackage: IPackageRegistryEntry | undefined, workspaceName?: string): void {
        if (!selectedPackage && workspaceName) {
             // Selected a workspace name
             this.setState({selectedPackage: undefined, disableNext: true, selectedWorkspace: workspaceName, deletedSelectedPackage: false});
        } else if (selectedPackage && !workspaceName) {
            // Selected a package

            // If the user selects a package without a version, default to using '0.0.1'
            const newVersion: string = selectedPackage.version ? selectedPackage.version : '0.0.1';

            this.setState({selectedPackage, selectedWorkspace: undefined, definitionName: selectedPackage.name, definitionVersion: newVersion, disableNext: false, deletedSelectedPackage: false }); // Reset definition name and version back to default.
        } else {
            // User probably deleted the selected package or workspace.
            this.setState({selectedPackage: undefined, selectedWorkspace: undefined, disableNext: true});

        }
    }

    handleDefinitionNameChange(definitionName: string, nameInvalid: boolean): void {
        let disableNext: boolean = false;
        if (nameInvalid || this.state.versionInvalid) {
            disableNext = true;
        }

        // Disable Next button if name is undefined
        this.setState({definitionName, disableNext, nameInvalid});
    }
    handleDefinitionVersionChange(definitionVersion: string, versionInvalid: boolean): void {
        let disableNext: boolean = false;
        if (versionInvalid || this.state.nameInvalid) {
            disableNext = true;
        }

        // Disable Next button if version is undefined
        this.setState({definitionVersion, disableNext, versionInvalid});
    }

    handleCommitChange(value: boolean): void {
        this.setState({commitSmartContract: value});
    }

    handlePackageWorkspace(workspaceName: string): void {
        Utils.postToVSCode({
            command: 'package',
            data: {
                workspaceName
            }
        });
    }

    handleDeploy(): void {
        Utils.postToVSCode({
            command: 'deploy',
            data: {
                environmentName: this.state.environmentName,
                channelName: this.state.channelName,
                selectedPackage: this.state.selectedPackage,
                definitionName: this.state.definitionName,
                definitionVersion: this.state.definitionVersion,
                commitSmartContract: this.state.commitSmartContract,
                collectionConfigPath: this.state.currentCollectionFile ? this.state.currentCollectionFile.path : undefined,
                endorsementPolicy: this.state.endorsementPolicy ? this.state.endorsementPolicy : undefined
            }
        });
    }

    handleCollectionChange(file: File): void {
        this.setState({currentCollectionFile: file});
    }

    handleEndorsementPolicyChange(policy: string): void {
        this.setState({endorsementPolicy: policy});
    }

    componentWillReceiveProps(props: any): void {
        if (this.state.selectedPackage) {
            const entry: IPackageRegistryEntry = props.deployData.packageEntries.find((_entry: IPackageRegistryEntry) => {
                return ((this.state.selectedPackage as IPackageRegistryEntry).version && _entry.name === (this.state.selectedPackage as IPackageRegistryEntry).name && _entry.version === (this.state.selectedPackage as IPackageRegistryEntry).version) || (!(this.state.selectedPackage as IPackageRegistryEntry).version && _entry.name === (this.state.selectedPackage as IPackageRegistryEntry).name);
            });

            if (!entry && this.state.progressIndex > 0) {
                // If the user has deleted the package in Step Two or Three - go back to Step One and show warning.
                this.setState({progressIndex: 0, selectedPackage: undefined, disableNext: true, deletedSelectedPackage: true});
            }
        }

        if (props.deployData.selectedPackage) {
            // If a new selected package is passed
            this.setState({selectedPackage: props.deployData.selectedPackage, definitionName: props.deployData.selectedPackage.name, definitionVersion: props.deployData.selectedPackage.version ? props.deployData.selectedPackage.version : '0.0.1',  disableNext: false});
        }

    }

    render(): JSX.Element {

        const subHeadingString: string = `Deploying to ${this.state.channelName} in ${this.state.environmentName}`;

        const currentIndex: number = this.state.progressIndex;

        let currentStepComponent: any;
        // Render components depending on the progress / step.
        if (currentIndex === 0) {
            currentStepComponent = <DeployStepOne packageEntries={this.props.deployData.packageEntries} selectedPackage={this.state.selectedPackage} workspaceNames={this.props.deployData.workspaceNames} selectedWorkspace={this.state.selectedWorkspace} deletedSelectedPackage={this.state.deletedSelectedPackage} onPackageChange={this.handlePackageChange} onPackageWorkspace={this.handlePackageWorkspace} />;
        } else if (currentIndex === 1) {
            currentStepComponent = <DeployStepTwo definitionNames={this.props.deployData.definitionNames} currentCollectionFile={this.state.currentCollectionFile} endorsementPolicy={this.state.endorsementPolicy} onCollectionChange={this.handleCollectionChange} onEndorsementPolicyChange={this.handleEndorsementPolicyChange} selectedPackage={this.state.selectedPackage as IPackageRegistryEntry} currentDefinitionName={this.state.definitionName} currentDefinitionVersion={this.state.definitionVersion} onDefinitionNameChange={this.handleDefinitionNameChange} onDefinitionVersionChange={this.handleDefinitionVersionChange}/>;
        } else {
            currentStepComponent = <DeployStepThree selectedPackage={this.state.selectedPackage as IPackageRegistryEntry} channelName={this.state.channelName} commitSmartContract={this.state.commitSmartContract} onCommitChange={this.handleCommitChange}/>;
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
                        <ButtonList onDeployClicked={this.handleDeploy} onProgressChange={this.handleProgressChange} currentIndex={this.state.progressIndex} disableNext={this.state.disableNext}/>
                    </div>
                    <div className='bx--col-lg-2'></div>
                </div>
                <div className='bx--row progress-row'>
                    <DeployProgressBar currentIndex={this.state.progressIndex}/>
                </div>

                {currentStepComponent}

            </div>

        );
    }
}

export default DeployPage;
