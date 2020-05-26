import React, { Component } from 'react';
import { Link, UnorderedList, ListItem, Accordion, AccordionItem, Toggle, MultiSelect, DataTable, TableContainer, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';

interface IProps {
    selectedPackage: IPackageRegistryEntry;
    channelName: string;
    commitSmartContract: undefined | boolean;
    onCommitChange: (value: boolean) => void;
}

interface StepThreeState {
    showCommitListItem: boolean;
}

class DeployStepThree extends Component<IProps, StepThreeState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            showCommitListItem: this.props.commitSmartContract !== undefined ? this.props.commitSmartContract : true
        };

        this.toggleCommit = this.toggleCommit.bind(this);
        this.changePeers = this.changePeers.bind(this);

    }

    toggleCommit(checked: boolean, _id: string, _event: any): void {
      this.setState({showCommitListItem: checked});
      this.props.onCommitChange(checked);
    }

    changePeers(_selectedItems: {selectedItems: {id: string; label: string; }[]}): void {
      return;
    }

    render(): JSX.Element {
        const headerData: {header: string, key: string}[] = [
          {
            header: 'Organization',
            key: 'organization',
          },
          {
            header: 'Approval status',
            key: 'status',
          }
        ];
        const rowData: {id: string, organization: string, status: string}[] = [
          {
            id: 'a',
            organization: 'Hardcoded',
            status: 'Value'
          },
          {
            id: 'b',
            organization: 'Needs to be',
            status: 'Changed'
          }
        ];

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

        return (
            <>
                <div className='bx--row margin-bottom-06'>
                    <div className='bx--col-lg-10'>
                        <span>When you select 'Deploy', the following steps will automatically occur:</span>

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
                            <AccordionItem id='customize' title={'Customize deployment step (advanced)'}>
                                <div className='bx--row margin-top-06'>
                                    <div className='bx--col'>
                                        <p>Perform commit step</p>
                                        <Toggle
                                            defaultToggled={this.state.showCommitListItem}
                                            id='commitToggle'
                                            labelA='Off'
                                            labelB='On'
                                            onToggle={this.toggleCommit}
                                        />
                                    </div>
                                    <div className='bx--col'>
                                        <p>Peers to endorse commit transactions</p>

                                        <MultiSelect
                                            id='carbon-multiselect-example'
                                            initialSelectedItems={[{id: 'id_1', label: 'hello'}, {id: 'id_2', label: 'world'}]}
                                            items={[{id: 'id_1', label: 'hello'}, {id: 'id_2', label: 'world'}, {id: 'id_3', label: '!!'}]}
                                            label='MultiSelect Label'
                                            onChange={this.changePeers}
                                        />

                                    </div>
                                </div>
                                <div className='bx--row margin-top-07'>
                                    <div className='bx--col'>
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
                                                <TableRow key={row.id}>
                                                  {row.cells.map((cell) => (
                                                    <TableCell key={cell.id}>{cell.value}</TableCell>
                                                  ))}
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>)}
                                      />
                                    </div>
                                </div>
                                <div className='bx--row margin-top-07'>
                                  <div className='bx--col'>
                                    <p>For an explanation of advanced scenarios, see the <Link href='#'>documentation</Link>.</p>
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
