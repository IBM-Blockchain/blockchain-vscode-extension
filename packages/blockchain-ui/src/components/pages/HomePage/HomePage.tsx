/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
import React, { Component } from 'react';
import { Link, Tag } from 'carbon-components-react';
import CommandTile from '../../elements/CommandTile/CommandTile';
import CommandLink from '../../elements/CommandLink/CommandLink';
import HeadingCombo from '../../elements/HeadingCombo/HeadingCombo';
import TelemetryLink from '../../elements/TelemetryLink/TelemetryLink';
import ThemedImage from '../../elements/ThemedImage/ThemedImage';
import { ExtensionCommands } from '../../../ExtensionCommands';
import devLearnerLight from '../../../resources/devLearnerLight.svg';
import devLearnerDark from '../../../resources/devLearnerDark.svg';
import fabric2Rocket from '../../../resources/rocket.svg';
import './HomePage.scss';

interface IProps {
    extensionVersion: string;
}

class HomePage extends Component<IProps> {
    render(): JSX.Element {
        const fabric2TileString: string = 'Congratulations on upgrading to v2.0 of the IBM Blockchain Platform VS Code extension! This update brings support for the Fabric 2.0 smart contract lifecycle, as well as new features. Learn about how this update will affect your workflow here.';
        const tutorialTileString: string = 'Learn about Hyperledger Fabric development using IBM Blockchain Platform. Complete these tutorials to grow your blockchain skills.';

        return (
            <div className='bx--grid home-page-container'>
                <div className='bx--row'>
                    <div className='bx--col-lg-9'>
                        <div className='bx--row home-title-container'>
                            <h2>IBM Blockchain Platform
                                <Tag className='extension-version' id='extension-version-tag' type='gray'>{`v${this.props.extensionVersion}`}</Tag>
                            </h2>
                            <p className='home-title-description'>This extension supports the complete development workflow for Hyperledger Fabric and IBM Blockchain Platform. Get started, and learn best practices with our tutorials.</p>
                        </div>
                        <div className='bx--row margin-bottom-05' id='fabric-2-tile-container'>
                            <CommandTile title={`Find out what's new with Fabric v2.0`} body={fabric2TileString} command={ExtensionCommands.OPEN_FABRIC_2_PAGE} image={fabric2Rocket}/>
                        </div>
                        <div className='bx--row' id='tutorial-tile-container'>
                            <CommandTile title='Tutorials' body={tutorialTileString} command={ExtensionCommands.OPEN_TUTORIAL_GALLERY}/>
                        </div>
                        <HeadingCombo
                            comboStyle='bx--row resources-title-container'
                            headingText='Other Resources'
                            headingStyle='other-resources-title'
                            subheadingText='Access these resources for reference and further learning outside the tutorials.'
                        />
                        <div className='bx--row resources-links-container'>
                            <div className='bx--col link-list-container'>
                                <Link href='https://cloud.ibm.com/docs/blockchain?topic=blockchain-get-started-ibp' id='home-link-01'>
                                    IBM Blockchain Platform documentation
                                </Link>
                                <TelemetryLink linkContents='Free e-book: Getting Started with Enterprise Blockchain' url='https://www.ibm.com/account/reg/uk-en/signup?formid=urx-38322&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+Oreilly+book+promo&cm_mmca1=000026VG&cm_mmca2=10008691' id='home-link-02'/>
                                <Link href='http://ibm.biz/blockchainuserseries' id='home-link-03'>
                                    Join the IBM Blockchain Platform User Series Webcast
                                </Link>
                                <Link href='https://www.ibm.com/blockchain/platform?schedulerform' id='home-link-04'>
                                    Schedule a free 1:1 consultation with an IBM Blockchain Platform expert
                                </Link>

                            </div>
                            <div className='bx--col link-list-container'>
                                <CommandLink linkContents='View Release notes' commandName={ExtensionCommands.OPEN_RELEASE_NOTES} id='home-link-05'/>
                                <CommandLink linkContents='View Sample Gallery' commandName={ExtensionCommands.OPEN_SAMPLE_GALLERY} id='home-link-06'/>
                                <Link href='https://github.com/IBM-Blockchain/blockchain-vscode-extension/wiki/Common-tasks-and-how-to-complete-them' id='home-link-12'>
                                    Common tasks wiki
                                </Link>
                                <Link href='https://hyperledger-fabric.readthedocs.io/en/release-2.0/' id='home-link-07'>
                                    Fabric Documentation
                                </Link>
                                <Link href='https://hyperledger.github.io/caliper-benchmarks/fabric/performance/' id='home-link-08'>
                                    Hyperledger Fabric performance reports
                                </Link>
                            </div>
                        </div>
                        <br/>
                        <div className='bx--row'>
                            <p>Problems? Check this <Link href='https://ibm-blockchain.github.io/blockchain-vscode-extension/' id='home-link-09'>status page</Link>, search <Link href='https://stackoverflow.com/questions/tagged/ibp-vscode-extension' id='home-link-10'>Stack Overflow</Link>, or raise an issue on <Link href='https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues' id='home-link-11'>GitHub</Link>.</p>
                        </div>
                    </div>
                    <div className='bx--col-lg-7'>
                        <ThemedImage darkImg={devLearnerDark} lightImg={devLearnerLight} altText='' id='dev-learner' className='dev-image'/>
                    </div>
                </div>
            </div>
        );
    }
}

export default HomePage;
