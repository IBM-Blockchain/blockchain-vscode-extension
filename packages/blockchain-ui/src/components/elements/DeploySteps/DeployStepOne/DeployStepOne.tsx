import React, { Component } from 'react';
import { Button, Dropdown, InlineNotification, TextInput } from 'carbon-components-react';
import DeployExplanation from '../../DeployExplanation/DeployExplanation';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';
import Utils from '../../../../Utils';

interface IProps {
    hasV1Capabilities: boolean;
    workspaceNames: string[];
    deletedSelectedPackage: boolean;
    packageEntries: IPackageRegistryEntry[];
    selectedWorkspace: string | undefined;
    selectedPackage: IPackageRegistryEntry | undefined; // Package the user has selected in dropdown
    chosenWorkspaceData: { language: string, name: string, version: string } | undefined;
    onPackageChange: (selectedPackage: IPackageRegistryEntry | undefined, workspaceName?: string) => void; // Callback to DeployPage
    onPackageWorkspace: (workspaceName: string, packageName: string, packageVersion: string) => void;
}

interface StepOneState {
    workspaceNames: string[];
    packageEntries: IPackageRegistryEntry[];
    packageName: string;
    packageVersion: string;
    nameInvalid: boolean;
    versionInvalid: boolean;
    chosenWorkspaceName: string | undefined;
}

class DeployStepOne extends Component<IProps, StepOneState> {

    unselectedPackageLabel: string = 'Select smart contract';

    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            packageEntries: this.props.packageEntries,
            workspaceNames: this.props.workspaceNames.length > 0 ? this.props.workspaceNames : [],
            packageName: '',
            packageVersion: '',
            nameInvalid: false,
            versionInvalid: false,
            chosenWorkspaceName: ''
        };

        this.formatAllEntries = this.formatAllEntries.bind(this);
        this.formatPackageEntry = this.formatPackageEntry.bind(this);
        this.formatWorkspaceEntry = this.formatWorkspaceEntry.bind(this);
        this.selectPackage = this.selectPackage.bind(this);
        this.packageWorkspace = this.packageWorkspace.bind(this);
        this.handlePackageNameChange = this.handlePackageNameChange.bind(this);
        this.handlePackageVersionChange = this.handlePackageVersionChange.bind(this);
        this.handleWorkspaceNameChange = this.handleWorkspaceNameChange.bind(this);

    }

    componentWillReceiveProps(receivedProps: IProps): void {

        let receivedNewPackages: boolean = false;

        if (receivedProps.packageEntries.length === this.state.packageEntries.length) {
            // Check each individual entry
            for (let i: number = 0; i < receivedProps.packageEntries.length; i++) {
                const newProp: IPackageRegistryEntry = receivedProps.packageEntries[i];
                const currentState: IPackageRegistryEntry = this.state.packageEntries[i];
                if (newProp.name !== currentState.name || newProp.version !== currentState.version) {
                    receivedNewPackages = true;
                    break;
                }
            }
        } else {
            // Different length, so different packages
            receivedNewPackages = true;
        }

        if (receivedNewPackages) {
            this.setState({packageEntries: receivedProps.packageEntries});
        }
    }

    selectPackage(data: any): void {

        // TODO: At some point we should move PackageRegistry to common, and call 'get' from here.
        // There would also be no need to pass in all entries when creating DeployView.

        let packageName: string;
        let packageVersion: string | undefined;

        if (data.selectedItem.includes(' (packaged)')) {
            // If selected a package

             // Get 'name@version' or just 'name'
            const packageIdentifier: string = data.selectedItem.split(' (packaged')[0];
            if (packageIdentifier.includes('@')) {
                // If it has a version
                const _splitParts: string[] = packageIdentifier.split('@');
                packageName = _splitParts[0];
                packageVersion = _splitParts[1];
            } else {
                // If it doesn't have a version
                packageName = packageIdentifier;
            }

            const selectedPackage: IPackageRegistryEntry | undefined = this.state.packageEntries.find((_entry: IPackageRegistryEntry) => {
                return (packageVersion && _entry.name === packageName && _entry.version === packageVersion) || (!packageVersion && _entry.name === packageName);
            }) as IPackageRegistryEntry;

            this.props.onPackageChange(selectedPackage);
        } else {
            // If selected an open workspace
            this.props.onPackageChange(undefined, data.selectedItem.split(' (open project)')[0]);

        }

    }

    formatAllEntries(): string[] {
        const packageNames: string[] = [];
        for (const name of this.state.workspaceNames) {
            const entryName: string = this.formatWorkspaceEntry(name);
            packageNames.push(entryName);
        }

        for (const entry of this.state.packageEntries) {
            const entryName: string = this.formatPackageEntry(entry);
            packageNames.push(entryName);
        }

        return packageNames;
    }

    formatPackageEntry(entry: IPackageRegistryEntry): string {
        if (entry.version) {
            return `${entry.name}@${entry.version} (packaged)`;
        } else {
            return `${entry.name} (packaged)`;
        }
    }

    formatWorkspaceEntry(workspaceName: string): string {
        return `${workspaceName} (open project)`;
    }

    handlePackageNameChange(data: any): void {
        const name: string = data.target.value.trim();
        this.setState({
            packageName: name,
            nameInvalid: Utils.isNameInvalid(name)
        });
    }

    handlePackageVersionChange(data: any): void {
        const version: string = data.target.value.trim();
        this.setState({
            packageVersion: version,
            versionInvalid: Utils.isVersionInvalid(version)
        });
    }

    handleWorkspaceNameChange(workspaceName: string | undefined): void {
        if (workspaceName && workspaceName !== this.state.chosenWorkspaceName) {
            this.setState({
                chosenWorkspaceName: workspaceName,
                packageVersion: '',
                packageName: ''
            });
        }
    }

    packageWorkspace(): void {
        // should not be able to package without chosenWorkspaceData so casting it to not be undefined
        const chosenWorkspaceData: { language: string, name: string, version: string } = this.props.chosenWorkspaceData as { language: string, name: string, version: string };

        let packageName: string = this.state.packageName;
        let packageVersion: string = this.state.packageVersion;

        if (chosenWorkspaceData.language === 'node') {
            packageName = chosenWorkspaceData.name;
            packageVersion = chosenWorkspaceData.version;
        }

        this.props.onPackageWorkspace(this.props.selectedWorkspace as string, packageName, packageVersion);
    }

    renderPackageInputs(): JSX.Element {
        let packageInputsJSX: JSX.Element = <></>;

        if (this.props.chosenWorkspaceData) {
            this.handleWorkspaceNameChange(this.props.selectedWorkspace);

            let nameInput: JSX.Element;
            let versionInput: JSX.Element;

            if (this.props.chosenWorkspaceData.language === 'node') {
                nameInput = (<TextInput invalidText={`Name can only contain alphanumeric, '_' and '-' characters.`} invalid={this.state.nameInvalid} id='nameInput' labelText='Package name' value={this.props.chosenWorkspaceData.name} disabled={true}></TextInput>);
                versionInput = (<TextInput invalidText={'Version cannot be empty'} invalid={this.state.versionInvalid} id='versionInput' labelText='Package version' value={this.props.chosenWorkspaceData.version} disabled={true}></TextInput>);
            } else {
                nameInput = (<TextInput invalidText={`Name can only contain alphanumeric, '_' and '-' characters.`} invalid={this.state.nameInvalid} id='nameInput' labelText='Package name' value={this.state.packageName} onChange={this.handlePackageNameChange}></TextInput>);
                versionInput = (<TextInput invalidText={'Version cannot be empty'} invalid={this.state.versionInvalid} id='versionInput' labelText='Package version' value={this.state.packageVersion} onChange={this.handlePackageVersionChange}></TextInput>);
            }

            const disablePackage: boolean = this.shouldDisablePackageButton(this.props.chosenWorkspaceData.language);

            packageInputsJSX = (
                <>
                    <div className='bx--row margin-bottom-03'>
                        <div className='bx--col-lg-7 bx--col-md-3 bx--col-sm-4'>
                            {nameInput}
                        </div>
                    </div>
                    <div className='bx--row margin-bottom-03'>
                        <div className='bx--col-lg-7 bx--col-md-3 bx--col-sm-4'>
                            {versionInput}
                        </div>
                    </div>
                    <div className='bx--row margin-bottom-03'>
                        <Button key='package' kind='primary' disabled={disablePackage} onClick={this.packageWorkspace}>Package open project</Button>
                    </div>
                </>
            );

        }
        return packageInputsJSX;
    }

    shouldDisablePackageButton(language: string): boolean {
        let disablePackage: boolean = false;
        if (language !== 'node' && (this.state.packageName === '' || this.state.packageVersion === '')) {
            disablePackage = true;
        }
        return disablePackage;
    }

    render(): JSX.Element {
        const items: string[] = this.formatAllEntries();

        let deletedMessage: JSX.Element | undefined;
        let packageMessage: JSX.Element | undefined;
        let packageStillExists: boolean = false;

        if (this.props.selectedPackage) {

            const packageToCheck: IPackageRegistryEntry | undefined = this.state.packageEntries.find((_package: IPackageRegistryEntry) => {
                return _package.name === (this.props.selectedPackage as IPackageRegistryEntry).name && _package.version === (this.props.selectedPackage as IPackageRegistryEntry).version;
            });

            packageStillExists = !!packageToCheck;

            if (!packageStillExists) {
                // User deleted the selected package.
                this.props.onPackageChange(undefined);
            }
        } else {
            if (this.props.deletedSelectedPackage) {
                // If the selected package was deleted whilst in Step Two or Three
                deletedMessage = (
                    <div className='bx--row margin-bottom-03'>
                        <div className='bx--col-lg-10'>
                            <InlineNotification
                            lowContrast={true}
                            kind='warning'
                            hideCloseButton={true}
                            title='The package you selected has been deleted'
                            />
                        </div>
                    </div>
                );
            }

            if (this.props.selectedWorkspace) {

                packageMessage = (
                    <>
                        <div className='bx--row margin-bottom-03'>
                            <div className='bx--col-lg-10'>
                                <InlineNotification
                                    hideCloseButton={true}
                                    kind='info'
                                    lowContrast={true}
                                    notificationType='inline'
                                    role='alert'
                                    statusIconDescription='describes the status icon'
                                    subtitle='before it can be used.'
                                    title='The contract must be packaged'
                                />
                            </div>
                        </div>
                        {this.renderPackageInputs()}
                    </>
                );

            }
        }

        return(
            <>
                <div className={'bx--row' + (packageMessage || deletedMessage ? '' : ' margin-bottom-10')}>
                    <div className='bx--col'>
                        <div style={{width: 384}}>
                            <Dropdown
                                ariaLabel='dropdown'
                                id='package-select'
                                invalidText='A valid value is required'
                                items={items}
                                label={this.unselectedPackageLabel}
                                titleText='Choose a smart contract to deploy'
                                type='default'
                                selectedItem={this.props.selectedPackage && packageStillExists  ? this.formatPackageEntry(this.props.selectedPackage) : (this.props.selectedWorkspace ? this.formatWorkspaceEntry(this.props.selectedWorkspace) :  this.unselectedPackageLabel)}
                                onChange={this.selectPackage}
                            />
                        </div>
                    </div>
                </div>
                {deletedMessage}
                {packageMessage}
                <div className='bx--row'>
                    <div className='bx--col-lg-10'>
                        <DeployExplanation showV2Explanation={!this.props.hasV1Capabilities}/>
                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepOne;
