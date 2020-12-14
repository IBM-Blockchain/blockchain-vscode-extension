import React, { FunctionComponent } from 'react';
import { Accordion, AccordionItem, Link, Tag } from 'carbon-components-react';
import ThemedImage from '../ThemedImage/ThemedImage';
import lightStep1 from '../../../resources/lightStep1.svg';
import lightStep2 from '../../../resources/lightStep2.svg';
import lightStep3 from '../../../resources/lightStep3.svg';
import lightStep4 from '../../../resources/lightStep4.svg';
import darkStep1 from '../../../resources/darkStep1.svg';
import darkStep2 from '../../../resources/darkStep2.svg';
import darkStep3 from '../../../resources/darkStep3.svg';
import darkStep4 from '../../../resources/darkStep4.svg';
import './DeployExplanation.scss';

interface IProps  {
    showV2Explanation: boolean;
}

const DeployExplanation: FunctionComponent<IProps>  = ({showV2Explanation}) => {
    let explanationJSX: JSX.Element = <></>;

    if (showV2Explanation) {
        explanationJSX = (
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
        );

    } else {
        explanationJSX = (
            <p>To find out more about Fabric v1.4 smart contract deployment, check out the documentation available <Link href='https://hyperledger-fabric.readthedocs.io/en/release-1.4/chaincode4noah.html' id='deploy-step-1-link'>here</Link>.</p>
        );
    }

    return explanationJSX;
};

export default DeployExplanation;
