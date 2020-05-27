import React, { Component } from 'react';
import { Dropdown, Accordion, AccordionItem, InlineNotification, NotificationActionButton } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';

interface IProps {
    workspaceNames: string[];
    deletedSelectedPackage: boolean;
    packageEntries: IPackageRegistryEntry[];
    selectedWorkspace: string | undefined;
    selectedPackage: IPackageRegistryEntry | undefined; // Package the user has selected in dropdown
    onPackageChange: (selectedPackage: IPackageRegistryEntry | undefined, workspaceName?: string) => void; // Callback to DeployPage
    onPackageWorkspace: (workspaceName: string) => void;
}

interface StepOneState {
    workspaceNames: string[];
    packageEntries: IPackageRegistryEntry[];
}

class DeployStepOne extends Component<IProps, StepOneState> {

    unselectedPackageLabel: string = 'Select smart contract';

    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            packageEntries: this.props.packageEntries,
            workspaceNames: this.props.workspaceNames.length > 0 ? this.props.workspaceNames : []
        };

        this.formatAllEntries = this.formatAllEntries.bind(this);
        this.formatPackageEntry = this.formatPackageEntry.bind(this);
        this.formatWorkspaceEntry = this.formatWorkspaceEntry.bind(this);
        this.selectPackage = this.selectPackage.bind(this);
        this.packageWorkspace = this.packageWorkspace.bind(this);

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

    packageWorkspace(): void {
        this.props.onPackageWorkspace(this.props.selectedWorkspace as string);
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
                    <div className='bx--row margin-bottom-03'>
                        <div className='bx--col-lg-10'>
                            <InlineNotification
                                actions={<NotificationActionButton style={{fontWeight: 600}} onClick={this.packageWorkspace}>Package open project</NotificationActionButton>}
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
                        <Accordion>
                            <AccordionItem title={'How does Fabric v2.X smart contract deployment work?'}>
                                <p>TODO</p>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepOne;
