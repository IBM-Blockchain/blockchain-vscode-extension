import React, { Component } from 'react';
import { Dropdown, Accordion, AccordionItem, InlineNotification, NotificationActionButton, Link, Tag } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';
import ThemedImage from '../../../elements/ThemedImage/ThemedImage';
import lightStep1 from '../../../../resources/lightStep1.svg';
import lightStep2 from '../../../../resources/lightStep2.svg';
import lightStep3 from '../../../../resources/lightStep3.svg';
import lightStep4 from '../../../../resources/lightStep4.svg';
import darkStep1 from '../../../../resources/darkStep1.svg';
import darkStep2 from '../../../../resources/darkStep2.svg';
import darkStep3 from '../../../../resources/darkStep3.svg';
import darkStep4 from '../../../../resources/darkStep4.svg';
import './DeployStepOne.scss';

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
                                <div className='bx--row margin-top-05 margin-bottom-09'>
                                    <p>This deployment flow simplifies the steps below and you will only need to know these steps if you intend on using the operator console to operate a Blockchain network. If you do wish to operate a network in the future, or just want to know about how the smart contract deployment works in Fabric v2.0, then continue reading.</p>
                                </div>
                                <div className='bx--row margin-bottom-09'>
                                    <div className='bx--col margin-right-07 padding-right-05'>
                                        <p className='step-title margin-bottom-05'>Step 1</p>
                                        <h6 className='margin-bottom-05'>Your smart contract is packaged</h6>
                                        <p className='margin-bottom-05'>We need to package the chaincode before it can be installed on our peers.</p>
                                    </div>
                                    <div className='bx--col'>
                                        <ThemedImage darkImg={darkStep1} lightImg={lightStep1} altText='' id='step-1-deploy' className=''/>
                                    </div>
                                </div>
                                <div className='bx--row margin-bottom-09'>
                                    <div className='bx--col'>
                                        <ThemedImage darkImg={darkStep2} lightImg={lightStep2} altText='' id='step-2-deploy'/>
                                    </div>
                                    <div className='bx--col margin-left-07 padding-left-05'>
                                        <p className='step-title margin-bottom-05'>Step 2</p>
                                        <h6 className='margin-bottom-05'>Each of the network's member organizations install the package on their peers</h6>
                                        <p className='margin-bottom-05'>After we package the smart contract, we can install the chaincode on our peers. The chaincode needs to be installed on every peer that will endorse a transaction.</p>
                                    </div>
                                </div>
                                <div className='bx--row margin-bottom-09'>
                                    <div className='bx--col margin-right-07 padding-right-05'>
                                        <div className='title-and-tag margin-bottom-05'>
                                            <span>Step 3</span>
                                            <Tag type='blue' className='fabric-2-tag'>New for Fabric v2.0</Tag>
                                        </div>
                                        <h6 className='margin-bottom-05'>Each organization approves a shared definition of what they will use on the channel</h6>
                                        <p className='margin-bottom-05'>After you install the chaincode package, you need to approve a chaincode definition for your organisation. The definition includes important parameters of chaincode governance such as the name, version, and the chaincode endorsement policy.</p>
                                    </div>
                                    <div className='bx--col'>
                                        <ThemedImage darkImg={darkStep3} lightImg={lightStep3} altText='' id='step-3-deploy'/>
                                    </div>
                                </div>
                                <div className='bx--row margin-bottom-09'>
                                    <div className='bx--col'>
                                        <ThemedImage darkImg={darkStep4} lightImg={lightStep4} altText='' id='step-4-deploy'/>
                                    </div>
                                    <div className='bx--col margin-left-07 padding-left-05'>
                                        <div className='title-and-tag margin-bottom-05'>
                                            <span>Step 4</span>
                                            <Tag type='blue' className='fabric-2-tag'>New for Fabric v2.0</Tag>
                                        </div>
                                        <h6 className='margin-bottom-05'>The definition is then committed: a transaction endorsed by the channel members</h6>
                                        <p className='margin-bottom-05'>After a sufficient number of organizations have approved a chaincode definition, one organization can commit the chaincode definition to the channel. If a majority of channel members have approved the definition, the commit transaction will be successful and the parameters agreed to in the chaincode definition will be implemented on the channel.</p>
                                    </div>
                                </div>
                                <div className='bx--row'>
                                    <p>To learn more, visit the <Link href='https://hyperledger-fabric.readthedocs.io/en/release-2.0/chaincode_lifecycle.html' id='deploy-step-1-link'>Fabric chaincode lifecycle</Link> section in the Hyperledger Fabric docs.</p>
                                </div>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepOne;
