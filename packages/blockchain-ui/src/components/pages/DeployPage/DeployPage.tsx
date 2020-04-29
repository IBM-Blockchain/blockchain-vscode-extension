import React, { Component } from 'react';
import HeadingCombo from '../../elements/HeadingCombo/HeadingCombo';
import './DeployPage.scss';
import ButtonList from '../../elements/ButtonList/ButtonList';
import DeployProgressBar from '../../elements/DeployProgressBar/DeployProgressBar';
import { Link, Dropdown, Accordion, AccordionItem } from 'carbon-components-react';

interface IProps {
    deployData: {channelName: string, environmentName: string};
}

interface DeployState {
    deployButtons: any[]; // Will probaly change this to {text: string, type: string}[] at some point.
}

class DeployPage extends Component<IProps, DeployState> {

    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            deployButtons: [{label: 'Next', disabled: true, kind: 'primary'}]
        };
    }

    render(): JSX.Element {

        const subHeadingString: string = `Deploying to ${this.props.deployData.channelName} in ${this.props.deployData.environmentName}`;
        return (
            <div className='bx--grid deploy-page-container'>
                <div className='bx--row'>
                    <div className='bx--col'>
                        <HeadingCombo
                            headingText='Deploy smart contract to environment'
                            subheadingText={subHeadingString}
                        />
                    </div>
                    <div className='bx--col'>
                        <ButtonList buttons={this.state.deployButtons}/>
                    </div>
                </div>
                <div className='bx--row'>
                    <DeployProgressBar/>
                </div>
                <div className='bx--row'>
                    <div className='bx--col'>
                        These developer tools can deploy to networks where you have all the admin keys - for example, local Fabric runtimes or personal dev/test networks on cloud.
                        For any more advanced deployments, please use the <Link href='#'>IBM Blockchain Platform Console</Link> or <Link href='#'>Hyperledger Fabric CLIs</Link>.
                    </div>
                </div>
                <div className='bx--row'>
                    <div className='bx--col'>
                        <br/>
                        <div style={{width: 300}}>
                            <Dropdown
                                ariaLabel='dropdown'
                                id='carbon-dropdown-example'
                                invalidText='A valid value is required'
                                items={['hello', 'world']}
                                label='Choose an option'
                                titleText='Choose a smart contract to deploy'
                                type='default'
                            />
                        </div>
                    </div>
                </div>
                <div className='bx--row'>
                    <div className='bx--col'>
                        <br/>
                        <Accordion>
                            <AccordionItem title={'How does Fabric v2.X smart contract deployment work?'}>
                                <p>Woah it finally worked.</p>
                            </AccordionItem>
                        </Accordion>
                    </div>

                </div>
            </div>

        );
    }
}

export default DeployPage;
