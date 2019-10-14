import React, { Component } from 'react';
import './TransactionViewPage.scss';
import Sidebar from '../TransactionViewSidebar/TransactionViewSidebar';
import { Accordion, AccordionItem, Link } from 'carbon-components-react';

type PageProps = {
    activeSmartContract: string
};

type PageState = { 
    activeSmartContract: string
}

class TransactionViewPage extends Component<PageProps, PageState> {

    constructor(props: Readonly<PageProps>) {
        super(props);
        this.state = {
            activeSmartContract: this.props.activeSmartContract
        }
    }

    public render() {
        return (
            <div className="page-container bx--grid">
                <div className="inner-container bx--row">
                    <Sidebar/>
                    <div className="page-contents bx--col">
                        <div className="titles-container">
                            <Link>{this.state.activeSmartContract}</Link>
                            <h1>Transactions</h1>
                        </div>
                        <div className="contents-container bx--row">
                            <div className="contents-left bx--col">
                                <p>Welcome to your transaction web view for <Link>{this.props.activeSmartContract}</Link>; use this to submit and evaluate new and existing transactions.</p>
                                <p>Unsure of where to start? Follow our introductory Getting Started section opposite.</p>
                                <br/>
                                <h5>Smart Contracts</h5>
                                <p>To switch to the web view for a different smart contract, select the smart contract below</p>
                                <Link>{this.state.activeSmartContract}</Link>
                                <br/>
                                <Link>congaContract@0.0.1</Link>
                            </div>
                            <div className="contents-right bx--col" id="contents-right">
                                <h5>Getting Started</h5>
                                <Accordion>
                                    <AccordionItem title="Create a new transaction"></AccordionItem>
                                </Accordion>
                                <Accordion>
                                    <AccordionItem title="Edit existing transactions"></AccordionItem>
                                </Accordion>
                                <Accordion>
                                    <AccordionItem title="Favouriting & deleting transactions"></AccordionItem>
                                </Accordion>
                                <Accordion>
                                    <AccordionItem title="Submitting and evaluating: what's the difference?"></AccordionItem>
                                </Accordion>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default TransactionViewPage;
