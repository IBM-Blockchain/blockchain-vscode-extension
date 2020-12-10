import React, { Component } from 'react';
import { Link, UnorderedList, ListItem, Accordion, AccordionItem, Toggle, MultiSelect, TextArea, TextInput} from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';
import DeployOrgApprovalTable from '../../DeployOrgApprovalTable/DeployOrgApprovalTable';

interface IProps {
    hasV1Capabilities: boolean;
    selectedPackage: IPackageRegistryEntry;
    channelName: string;
    commitSmartContract: undefined | boolean;
    selectedPeers: string[];
    orgApprovals: any;
    orgMap: any;
    environmentPeers: string[];
    discoveredPeers: string[];
    committedDefinitions: string[];
    onCommitChange: (value: boolean) => void;
    onPeerChange: (peers: string[]) => void;
    onGetOrgApproval: () => void;
    onInstantiateFunctionNameChange: (value: string) => void;
    onInstantiateFunctionArgsChange: (value: string) => void;
}

interface StepThreeState {
    showCommitListItem: boolean;
    selectedPeers: string[];
}

class DeployStepThree extends Component<IProps, StepThreeState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            showCommitListItem: this.props.commitSmartContract !== undefined ? this.props.commitSmartContract : true,
            selectedPeers: this.props.selectedPeers
        };

        this.toggleCommit = this.toggleCommit.bind(this);
        this.changePeers = this.changePeers.bind(this);
        this.formatDiscoveredPeers = this.formatDiscoveredPeers.bind(this);

    }

    componentWillMount(): void {
        this.props.onGetOrgApproval();
    }

    toggleCommit(checked: boolean, _id: string, _event: any): void {
        this.setState({ showCommitListItem: checked });
        this.props.onCommitChange(checked);
    }

    changePeers(event: { selectedItems: { id: string; label: string; }[] }): void {
        const peers: string[] = event.selectedItems.map((peerObject: { id: string, label: string }) => {
            return peerObject.id;
        });
        this.props.onPeerChange(peers);
    }

    formatDiscoveredPeers(peers: string[]): { id: string, label: string }[] {
        return peers.map((_peer) => {
            return { id: _peer, label: _peer };
        });
    }

    handleInstantiateFunctionNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.props.onInstantiateFunctionNameChange(event.target.value);
    }

    handleInstantiateFunctionArgsChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
        this.props.onInstantiateFunctionArgsChange(event.currentTarget.value);
    }

    checkIfUpgrade(): boolean {
        let isUpgrade: boolean = false;
        if (this.props.committedDefinitions.find((entry: string) => entry.includes(`${this.props.selectedPackage.name}@`))) {
            isUpgrade = true;
        }
        return isUpgrade;
    }

    renderAdvancedOptions(): JSX.Element {
        let advancedOptionsJSX: JSX.Element = <></>;

        if (this.props.hasV1Capabilities) {
            advancedOptionsJSX = (
                <>
                    <div className='bx--row margin-top-06'>
                        <div className='bx--col'>
                            <p>Optional: Enter name of function to call on instantiate</p>
                            <TextInput
                                id='instantiate-function-input'
                                labelText='Optional: Enter name of function to call on instantiate'
                                hideLabel={true}
                                placeholder=''
                                onChange={this.handleInstantiateFunctionNameChange}
                            />
                        </div>
                    </div>
                    <div className='bx--row margin-top-06'>
                        <div className='bx--col'>
                            <p>Optional: Enter arguments for instantiate function</p>
                            <TextArea
                                labelText='Optional: Enter arguments for instantiate function'
                                id='instantiate-args-text-area'
                                hideLabel={true}
                                placeholder={`eg ["arg1", "arg2"]`}
                                onChange={this.handleInstantiateFunctionArgsChange}
                            />
                        </div>
                    </div>
                </>
            );
        } else {
            const discoveredPeerObjects: { id: string, label: string }[] = this.formatDiscoveredPeers(this.props.discoveredPeers);
            const selectedPeers: { id: string, label: string }[] = this.formatDiscoveredPeers(this.state.selectedPeers);
            advancedOptionsJSX = (
                <>
                    <div className='bx--row margin-top-06'>
                        <div className='bx--col'>
                            <p>Perform commit</p>
                            <Toggle
                                defaultToggled={this.state.showCommitListItem}
                                id='commitToggle'
                                labelA='Off'
                                labelB='On'
                                onToggle={this.toggleCommit}
                            />
                        </div>
                        <div className='bx--col'>
                            <p>Additional peers to endorse commit transactions</p>
                            <MultiSelect
                                id='peer-select'
                                initialSelectedItems={selectedPeers}
                                items={discoveredPeerObjects}
                                label='Select peers'
                                onChange={this.changePeers}
                            />
                        </div>
                    </div>
                    <div className='bx--row margin-top-07'>
                        <div className='bx--col'>
                            <DeployOrgApprovalTable orgApprovals={this.props.orgApprovals} orgMap={this.props.orgMap} environmentPeers={this.props.environmentPeers}/>
                        </div>
                    </div>
                    <div className='bx--row margin-top-07'>
                        <div className='bx--col'>
                            <p>For an explanation of advanced scenarios, see the <Link href='https://hyperledger-fabric.readthedocs.io/en/release-2.0/chaincode_lifecycle.html'>documentation</Link>.</p>
                        </div>
                    </div>
                </>
            );
        }

        return advancedOptionsJSX;
    }

    render(): JSX.Element {
        let commitListItem: JSX.Element = <></>;

        if (this.state.showCommitListItem && !this.props.hasV1Capabilities) {
            commitListItem = <ListItem>Commit the definition to `{this.props.channelName}`</ListItem>;
        }

        let packageName: string;
        if (this.props.selectedPackage.version) {
            packageName = `${this.props.selectedPackage.name}@${this.props.selectedPackage.version}`;
        } else {
            packageName = `${this.props.selectedPackage.name}`;
        }

        let actionUppercase: string = '';
        let actionLowercase: string = '';
        if (this.props.hasV1Capabilities) {
            actionUppercase = this.checkIfUpgrade() ? 'Upgrade' : 'Instantiate';
            actionLowercase = this.checkIfUpgrade() ? 'upgrade' : 'instantiation';
        }

        const advancedOptionsJSX: JSX.Element = this.renderAdvancedOptions();

        return (
            <>
                <div className='bx--row margin-bottom-06'>
                    <div className='bx--col-lg-10'>
                        <span>When you select 'Deploy', the following actions will automatically occur:</span>

                        <UnorderedList className='padding-left-07 padding-top-05'>
                            <ListItem>
                                Install smart contract package `{packageName}` on all peers
                            </ListItem>
                            {this.props.hasV1Capabilities
                                ? <ListItem> {actionUppercase} smart contract package </ListItem>
                                : <ListItem> Approve the same smart contract definition for each organization </ListItem>
                            }
                            {commitListItem}

                        </UnorderedList>
                    </div>
                </div>
                <div className='bx--row margin-bottom-07'>
                    <div className='bx--col-lg-10'>
                        <Accordion id='advancedAccordion'>
                            <AccordionItem id='customize' title={this.props.hasV1Capabilities ? `Customize ${actionLowercase} (advanced)` : 'Customize commit (advanced)'}>
                                {advancedOptionsJSX}
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepThree;
