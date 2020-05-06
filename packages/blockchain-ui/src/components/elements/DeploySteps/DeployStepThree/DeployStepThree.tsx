import React, { Component } from 'react';
import { UnorderedList, ListItem } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';

interface IProps {
    selectedPackage: IPackageRegistryEntry;
    channelName: string;
}

class DeployStepThree extends Component<IProps> {

    render(): JSX.Element {
        return (
            <>
                <div className='bx--row margin-bottom-06'>
                    <div className='bx--col'>
                        The following steps will all be automatically carried out to deploy this smart contract:

                        <UnorderedList>
                            <ListItem>
                                Install smart contract package `{this.props.selectedPackage.name}@{this.props.selectedPackage.version}` on all peers
                            </ListItem>
                            <ListItem>
                                Approve the same smart contract definition for each organization
                            </ListItem>
                            <ListItem>
                                Commit the definition to `{this.props.channelName}`
                            </ListItem>
                        </UnorderedList>
                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepThree;
