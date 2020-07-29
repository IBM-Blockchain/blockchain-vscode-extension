import React from 'react';
import { Accordion, AccordionItem, ListItem, Link, OrderedList } from 'carbon-components-react';
import CommandLink from '../../elements/CommandLink/CommandLink';
import fabric2Rocket from '../../../resources/rocket.svg';
import './Fabric2Page.scss';
import { ExtensionCommands } from '../../../ExtensionCommands';

function Fabric2Page(): JSX.Element {
    return (
        <>
            <div className='fabric2-heading-container'>
                <div className='fabric2-icon-and-title'>
                    <img src={fabric2Rocket} alt='' className='fabric2-rocket' id='fabric2-rocket'></img>
                    <h3>Find out what's new with Fabric v2.0</h3>
                </div>
                <p>Congratulations on upgrading to Fabric v2.0! This update brings a new smart contract lifecycle, as well as new features. Learn about how this update will affect your work flow below</p>
            </div>
            <div className='fabric2-content-container'>
                <h4>What's new?</h4>
                <Accordion>
                    <AccordionItem title='Deploy smart contracts with ease' open>
                        <p>Smart contracts are now deployed using a new smart contract lifecycle. This deployment view introduces you to the Fabric v2.0 smart contract lifecycle through a series of easy-to-follow, convenient steps, aided by some information about how Fabric v2.0 smart contract deployment works underneath this flow.</p>
                        <p>We recommend you following the updated <CommandLink linkContents='A3: Deploying a smart contract' commandName={ExtensionCommands.OPEN_TUTORIAL_PAGE} commandData={['Basic tutorials', 'A3: Deploying a smart contract']}/> tutorial in the <CommandLink linkContents='Tutorial gallery' commandName={ExtensionCommands.OPEN_TUTORIAL_GALLERY}/> to learn how to access and use this deployment view.</p>
                    </AccordionItem>
                    <AccordionItem title='New smart contract lifecycle'>
                        <p>The smart contract lifecycle now has the following steps;</p>
                        <OrderedList>
                            <ListItem>Package your smart contract</ListItem>
                            <ListItem>Install the smart contract on your peers</ListItem>
                            <ListItem>Approve a generated smart contract definition</ListItem>
                            <ListItem>Commit the smart contract to the channel</ListItem>
                        </OrderedList>
                        <p>This allows for decentralised governance of smart contracts.</p>
                        <p>Don't worry about memorising this process as the deployment view makes it easy for you to deploy a smart contract without needing to know the steps above. Learn more about the new smart contract lifecycle and further Fabric v2.0 changes in the Fabric documentation <Link href='https://hyperledger-fabric.readthedocs.io/en/release-2.0/whatsnew.html'>here</Link>.</p>
                    </AccordionItem>
                </Accordion>
            </div>
            <div className='fabric2-additional-info-container'>
                <h4>Additional information</h4>
                <p>If you are running a production environment at v1.4, find the latest bug fixes for this <Link href='https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases'>here</Link>.</p>
            </div>
        </>
    );
}

export default Fabric2Page;
