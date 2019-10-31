import React, { Component } from 'react';
import './TransactionHome.scss';
import { Accordion, AccordionItem } from 'carbon-components-react';
import Sidebar from '../TransactionSidebar/TransactionSidebar';

interface PageProps {
    messageData: {smartContracts: Array<string>, activeSmartContract: string};
}

interface PageState {
    smartContracts: string[];
    activeSmartContract: string;
}

class TransactionHome extends Component<PageProps, PageState> {

    constructor(props: Readonly<PageProps>) {
        super(props);
        this.state = {
            smartContracts: this.props.messageData.smartContracts,
            activeSmartContract: this.props.messageData.activeSmartContract
        };
    }

    public switchSmartContract(selectedSmartContract: string): void {
        this.setState({
            activeSmartContract: selectedSmartContract
        });
    }

    public render(): any {
        return (
            <div className='page-container bx--grid' data-test-id='txn-page'>
                <div className='inner-container bx--row'>
                    <Sidebar/>
                    <div className='page-contents bx--col'>
                        <div className='titles-container'>
                            <span>{this.state.activeSmartContract} home</span>
                            <h1>Transactions</h1>
                        </div>
                        <div className='contents-container bx--row'>
                            <div className='contents-left bx--col'>
                                <p>Welcome to your transaction web view for <span className='disabled-smart-contract'>{this.state.activeSmartContract}</span>; use this to submit and evaluate new and existing transactions.</p>
                                <p>Unsure of where to start? Follow our introductory Getting Started section opposite.</p>
                                <br/>
                                <h5>Smart Contracts</h5>
                                <p>To switch to the web view for a different smart contract, select the smart contract below</p>
                                {this.getSmartContractItems(this.state.smartContracts)}
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

    private getSmartContractItems(smartContracts: string[]): any {
        const smartContractItems: any = [];

        for (const contract of smartContracts) {
            if (contract === this.state.activeSmartContract) {
                smartContractItems.push(<li className='smart-contract-item disabled-smart-contract' key={contract}>{contract}</li>);
            } else {
                smartContractItems.push(<li className='smart-contract-item clickable-smart-contract' key={contract}  onClick={(): void => this.switchSmartContract(contract)}>{contract}</li>);
            }
        }

        return <ul>{smartContractItems}</ul>;
    }
}

export default TransactionHome;
