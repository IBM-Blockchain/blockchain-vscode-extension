import React, { Component } from 'react';
import { Dropdown, Accordion, AccordionItem, InlineNotification } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';

interface IProps {
    deletedSelectedPackage: boolean;
    packageEntries: IPackageRegistryEntry[];
    selectedPackage: IPackageRegistryEntry | undefined; // Package the user has selected in dropdown
    onPackageChange: (selectedPackage: IPackageRegistryEntry | undefined) => void; // Callback to DeployPage
}

interface StepOneState {
    packageEntries: IPackageRegistryEntry[];
}

class DeployStepOne extends Component<IProps, StepOneState> {

    unselectedPackageLabel: string = 'Select smart contract';

    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            packageEntries: this.props.packageEntries
        };

        this.formatPackageEntries = this.formatPackageEntries.bind(this);
        this.formatEntry = this.formatEntry.bind(this);
        this.selectPackage = this.selectPackage.bind(this);

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
    }

    formatPackageEntries(): string[] {
        return this.state.packageEntries.map((entry: IPackageRegistryEntry) => {
            return this.formatEntry(entry);
        });
    }

    formatEntry(entry: IPackageRegistryEntry): string {
        if (entry.version) {
            return `${entry.name}@${entry.version} (packaged)`;
        } else {
            return `${entry.name} (packaged)`;
        }

    }

    render(): JSX.Element {
        const items: string[] = this.formatPackageEntries();

        let deletedMessage: JSX.Element | undefined;
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
                    <InlineNotification
                    lowContrast={true}
                    kind='warning'
                    hideCloseButton={true}
                    title='The package you selected has been deleted'
                    />
                );
            }
        }

        return (
            <>
                <div className='bx--row dropdown-row'>
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
                                selectedItem={this.props.selectedPackage && packageStillExists  ? this.formatEntry(this.props.selectedPackage) :  this.unselectedPackageLabel}
                                onChange={this.selectPackage}
                            />
                        </div>
                    </div>
                </div>
                {deletedMessage}
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
