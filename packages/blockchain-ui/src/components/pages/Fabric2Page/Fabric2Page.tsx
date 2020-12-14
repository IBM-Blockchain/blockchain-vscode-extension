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
                <p>Congratulations on upgrading to v2.0 of the IBM Blockchain Platform VS Code extension! This update brings support for the Fabric 2.0 smart contract lifecycle, as well as new features. Learn about how this update will affect your work flow below</p>
            </div>
            <div className='fabric2-content-container'>
                <h4>What's new?</h4>
                <Accordion>
                    <AccordionItem title='Deploy smart contracts with ease' open>
                        <p>Smart contracts can now be deployed using the new smart contract lifecycle. This deployment view introduces you to the Fabric v2.0 smart contract lifecycle through a series of easy-to-follow, convenient steps, aided by some information about how Fabric v2.0 smart contract deployment works underneath this flow.</p>
                        <p>We recommend you following the updated <CommandLink linkContents='A3: Deploying a smart contract' commandName={ExtensionCommands.OPEN_TUTORIAL_PAGE} commandData={['Basic tutorials', 'A3: Deploying a smart contract']}/> tutorial in the <CommandLink linkContents='Tutorial gallery' commandName={ExtensionCommands.OPEN_TUTORIAL_GALLERY}/> to learn how to access and use this deployment view.</p>
                    </AccordionItem>
                    <AccordionItem title='New smart contract lifecycle'>
                        <p>The Fabric 2.0 smart contract lifecycle has the following steps;</p>
                        <OrderedList>
                            <ListItem>Package your smart contract</ListItem>
                            <ListItem>Install the smart contract on your peers</ListItem>
                            <ListItem>Approve a generated smart contract definition</ListItem>
                            <ListItem>Commit the smart contract to the channel</ListItem>
                        </OrderedList>
                        <p>This allows for decentralised governance of smart contracts.</p>
                        <p>Don't worry about memorising this process as the deployment view makes it easy for you to deploy a smart contract without needing to know the steps above. Learn more about the new smart contract lifecycle and further Fabric v2.0 changes in the Fabric documentation <Link href='https://hyperledger-fabric.readthedocs.io/en/release-2.0/whatsnew.html'>here</Link>.</p>
                    </AccordionItem>
                    <AccordionItem title='Install, instantiate and upgrade workflow'>
                        <p>The install, instantiate and upgrade commands are now a part of the deploy view and can be performed in a single action - this occurs when attempting to deploy a smart contract to a V1 capability channel.</p>
                        <p>In order to install and instantiate (or upgrade) using the deploy view, you must make sure you create or connect to a network with a channel that uses V1 channel capabilities.</p>
                    </AccordionItem>
                    <AccordionItem title='Previously added environments, gateways and wallets using version 1'>
                        <p>Due to changes within the extension's code, any environments, gateways and wallets will need to be re-added to the extension.</p>
                        <p>No need to worry, these files have not been deleted and can be retrieved from "~/.fabric-vscode" (default location) if required.</p>
                    </AccordionItem>

                </Accordion>
            </div>
            <div className='fabric2-additional-info-container'>
                <h4>Previous releases</h4>
                <p>If you wish to use a previous version of the extension, you can find older VSIX's <Link href='https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases'>here</Link>.</p>
            </div>
        </>
    );
}

export default Fabric2Page;
