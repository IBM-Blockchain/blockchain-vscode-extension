import React, { Component } from 'react';
import './TransactionPage.scss';
import TransactionForm from '../TransactionForm/TransactionForm';
import TransactionOutput from '../TransactionOutput/TransactionOutput';
import ISmartContract from '../../../interfaces/ISmartContract';

interface IProps {
    gatewayName: string;
    smartContract: ISmartContract;
    transactionOutput: string;
    postMessageHandler: (command: string, data?: any) => void;
}

interface IState {
    gatewayName: string;
    smartContract: ISmartContract;
    transactionOutput: string;
    postMessageHandler: (command: string, data?: any) => void;
}

class TransactionPage extends Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            gatewayName: this.props.gatewayName,
            smartContract: this.props.smartContract,
            transactionOutput: this.props.transactionOutput,
            postMessageHandler: this.props.postMessageHandler
        };
    }

    componentDidUpdate(prevProps: IProps): void {
        if (prevProps.transactionOutput !== this.props.transactionOutput) {
            this.setState({
                transactionOutput: this.props.transactionOutput
            });
        }
    }

    render(): JSX.Element {
        return (
            <div className='page-container bx--grid' data-test-id='txn-page'>
                <div className='inner-container bx--row'>
                    <div className='page-contents bx--col'>
                        <div className='titles-container'>
                            <span className='home-link'>Transacting with: {this.state.gatewayName} > {this.state.smartContract.channel} > {this.state.smartContract.label}</span>
                            <h2>Create a new transaction</h2>
                        </div>
                        <div className='contents-container bx--row'>
                            <div className='bx--col'>
                                <TransactionForm smartContract={this.state.smartContract} postMessageHandler={this.state.postMessageHandler}/>
                            </div>
                        </div>
                    </div>
                    <div className='bx--col'>
                        <TransactionOutput output={this.state.transactionOutput}/>
                    </div>
                </div>
            </div>
        );
    }

}

export default TransactionPage;
