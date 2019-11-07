import React, { Component } from 'react';
import './TransactionHome.scss';
import { Accordion, AccordionItem } from 'carbon-components-react';
import Sidebar from '../TransactionSidebar/TransactionSidebar';
import ISmartContract from '../../interfaces/ISmartContract';

interface HomeProps {
    messageData: {
        activeSmartContract: ISmartContract,
        smartContracts: Array<ISmartContract>
    };
    switchSmartContract: (newActiveContract: string) => void;
}

interface HomeState {
    activeSmartContractLabel: string;
    smartContractLabels: Array<string>;
    switchSmartContract: (newActiveContract: string) => void;
}

class TransactionHome extends Component<HomeProps, HomeState> {

    constructor(props: Readonly<HomeProps>) {
        super(props);
        this.state = this.setUpState(this.props);
    }

    componentDidUpdate(prevProps: HomeProps): void {
        if (prevProps.messageData.activeSmartContract.label !== this.props.messageData.activeSmartContract.label) {
            this.setState({
                activeSmartContractLabel: this.props.messageData.activeSmartContract.label
            });
        }
    }

    public render(): any {
        return (
            <div className='page-container bx--grid' data-test-id='txn-page'>
                <div className='inner-container bx--row'>
                    <Sidebar/>
                    <div className='page-contents bx--col'>
                        <div className='titles-container'>
                            <span>{this.state.activeSmartContractLabel} home</span>
                            <h1>Transactions</h1>
                        </div>
                        <div className='contents-container bx--row'>
                            <div className='contents-left bx--col'>
                                <p>Welcome to your transaction web view for <span className='disabled-smart-contract'>{this.state.activeSmartContractLabel}</span>; use this to submit and evaluate new and existing transactions.</p>
                                <p>Unsure of where to start? Follow our introductory Getting Started section opposite.</p>
                                <br/>
                                <h5>Smart Contracts</h5>
                                <p>To switch to the web view for a different smart contract, select the smart contract below</p>
                                {this.getSmartContractItems(this.state.smartContractLabels)}
                            </div>
                            <div className='contents-right bx--col' id='contents-right'>
                                <h5>Getting Started</h5>
                                <Accordion>
                                    <AccordionItem title={'Create a new transaction'}></AccordionItem>
                                </Accordion>
                                <Accordion>
                                    <AccordionItem title={'Edit existing transactions'}></AccordionItem>
                                </Accordion>
                                <Accordion>
                                    <AccordionItem title={'Favouriting & deleting transactions'}></AccordionItem>
                                </Accordion>
                                <Accordion>
                                    <AccordionItem title={'Submitting and evaluating: what\'s the difference?'}></AccordionItem>
                                </Accordion>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private setUpState(receivedProps: HomeProps): HomeState {
        const contractLabels: Array<string> = [];
        for (const contract of receivedProps.messageData.smartContracts) {
            contractLabels.push(contract.label);
        }

        return {
            activeSmartContractLabel: receivedProps.messageData.activeSmartContract.label,
            smartContractLabels: contractLabels,
            switchSmartContract: receivedProps.switchSmartContract
        };
    }

    private getSmartContractItems(smartContracts: Array<string>): any {
        const smartContractItems: any = [];

        for (const contract of smartContracts) {
            if (contract === this.state.activeSmartContractLabel) {
                smartContractItems.push(<li className='smart-contract-item disabled-smart-contract' key={contract}>{contract}</li>);
            } else {
                smartContractItems.push(<li className='smart-contract-item clickable-smart-contract' key={contract}  onClick={(): void => this.state.switchSmartContract(contract)}>{contract}</li>);
            }
        }

        return <ul>{smartContractItems}</ul>;
    }
}

export default TransactionHome;
