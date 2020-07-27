import React, { Component } from 'react';
import { Link, UnorderedList, ListItem, Accordion, AccordionItem, Toggle, MultiSelect, DataTable, TableContainer, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, InlineNotification } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';

interface IProps {
    selectedPackage: IPackageRegistryEntry;
    channelName: string;
    commitSmartContract: undefined | boolean;
    selectedPeers: string[];
    orgApprovals: any;
    orgMap: any;
    environmentPeers: string[];
    discoveredPeers: string[];
    onCommitChange: (value: boolean) => void;
    onPeerChange: (peers: string[]) => void;
    onGetOrgApproval: () => void;
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

    render(): JSX.Element {
        const headerData: { header: string, key: string }[] = [
            {
                header: 'Organization',
                key: 'organization',
            },
            {
                header: 'Approval status',
                key: 'status',
            }
        ];

        let tableElement: JSX.Element = <></>;

        if (this.props.orgApprovals) {
            const rowData: { id: string, organization: string, status: string }[] = [];

            const approvalEntries: any[] = Object.entries(this.props.orgApprovals);

            if (approvalEntries.length > 0) {
                for (const [org, approved] of approvalEntries) {

                    let environmentPeer: string | undefined;
                    if (!approved) {
                        // Org should be marked as pending if we're about to deploy on an organisations peers.
                        environmentPeer = this.props.orgMap[org].find((_peer: string) => this.props.environmentPeers.includes(_peer));
                    }

                    const entry: { id: string, organization: string, status: string } = {
                        id: org,
                        organization: org,
                        status: approved ? 'Approved' : environmentPeer ? 'Pending (part of this deploy)' : 'Not approved'
                    };

                    rowData.push(entry);

                    tableElement = (
                        <DataTable
                            rows={rowData}
                            headers={headerData}
                            render={({ rows, headers, getHeaderProps }) => (
                                <TableContainer>
                                    <Table size='short'>
                                        <TableHead>
                                            <TableRow>
                                                {headers.map((header) => (
                                                    <TableHeader {...getHeaderProps({ header })}>
                                                        {header.header}
                                                    </TableHeader>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((row) => (
                                                <TableRow id={row.id + '-row'} key={row.id}>
                                                    {row.cells.map((cell) => (
                                                        <TableCell key={cell.id}>{cell.value}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>)}
                        />
                    );
                }
            } else {
            tableElement = (
                    <InlineNotification
                        hideCloseButton={true}
                        kind='info'
                        lowContrast={true}
                        notificationType='inline'
                        role='alert'
                        statusIconDescription='describes the status icon'
                        subtitle={<p>Commit has already been performed for this definition name and version.</p>}
                        title='Unable to get organisation approvals'
                    />
                );
            }
        } else {
            tableElement = (<p>Retrieving organisation approvals...</p>);
        }

        let commitListItem: JSX.Element = <></>;

        if (this.state.showCommitListItem) {
            commitListItem = <ListItem>Commit the definition to `{this.props.channelName}`</ListItem>;
        }

        let packageName: string;
        if (this.props.selectedPackage.version) {
            packageName = `${this.props.selectedPackage.name}@${this.props.selectedPackage.version}`;
        } else {
            packageName = `${this.props.selectedPackage.name}`;
        }

        const discoveredPeerObjects: { id: string, label: string }[] = this.formatDiscoveredPeers(this.props.discoveredPeers);
        const selectedPeers: { id: string, label: string }[] = this.formatDiscoveredPeers(this.state.selectedPeers);

        return (
            <>
                <div className='bx--row margin-bottom-06'>
                    <div className='bx--col-lg-10'>
                        <span>When you select 'Deploy', the following actions will automatically occur:</span>

                        <UnorderedList className='padding-left-07 padding-top-05'>
                            <ListItem>
                                Install smart contract package `{packageName}` on all peers
                            </ListItem>
                            <ListItem>
                                Approve the same smart contract definition for each organization
                            </ListItem>
                            {commitListItem}

                        </UnorderedList>
                    </div>
                </div>
                <div className='bx--row margin-bottom-07'>
                    <div className='bx--col-lg-10'>
                        <Accordion id='advancedAccordion'>
                            <AccordionItem id='customize' title={'Customize commit (advanced)'}>
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
                                        {tableElement}
                                    </div>
                                </div>
                                <div className='bx--row margin-top-07'>
                                    <div className='bx--col'>
                                        <p>For an explanation of advanced scenarios, see the <Link href='https://hyperledger-fabric.readthedocs.io/en/release-2.0/chaincode_lifecycle.html'>documentation</Link>.</p>
                                    </div>
                                </div>
                            </AccordionItem>
                        </Accordion>

                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepThree;
