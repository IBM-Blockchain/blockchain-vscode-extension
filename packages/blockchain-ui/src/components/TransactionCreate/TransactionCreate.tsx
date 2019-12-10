import React, { Component } from 'react';
import './TransactionCreate.scss';
import TransactionCreateForm from '../../components/TransactionCreateForm/TransactionCreateForm';
import TransactionOutput from '../../components/TransactionOutput/TransactionOutput';
import ISmartContract from '../../interfaces/ISmartContract';

interface CreateProps {
    activeSmartContract: ISmartContract;
    transactionOutput: string;
    postMessageHandler: (command: string, data?: any) => void;
}

interface CreateState {
    activeSmartContract: ISmartContract;
    transactionOutput: string;
    postMessageHandler: (command: string, data?: any) => void;
}

class TransactionCreate extends Component<CreateProps, CreateState> {
    constructor(props: Readonly<CreateProps>) {
        super(props);
        this.state = {
            activeSmartContract: this.props.activeSmartContract,
            transactionOutput: this.props.transactionOutput,
            postMessageHandler: this.props.postMessageHandler
        };
    }

    componentDidUpdate(prevProps: CreateProps): void {
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
                            <span className='home-link' onClick={(): void => this.state.postMessageHandler('home')}>Transactions webview home</span>
                            <h2>Create a new transaction</h2>
                        </div>
                        <div className='contents-container bx--row'>
                            <div className='bx--col'>
                                <TransactionCreateForm activeSmartContract={this.state.activeSmartContract} postMessageHandler={this.state.postMessageHandler}/>
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

export default TransactionCreate;
