import React, { Component } from 'react';
import './TransactionPage.scss';
import TransactionForm from '../../elements/TransactionForm/TransactionForm';
import TransactionOutput from '../../elements/TransactionOutput/TransactionOutput';
import ISmartContract from '../../../interfaces/ISmartContract';

interface IProps {
    transactionData: {gatewayName: string, smartContract: ISmartContract };
    transactionOutput: string;
}

interface IState {
    gatewayName: string;
    smartContract: ISmartContract;
    transactionOutput: string;
}

class TransactionPage extends Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            gatewayName: this.props.transactionData.gatewayName,
            smartContract: this.props.transactionData.smartContract,
            transactionOutput: this.props.transactionOutput,
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
                                <TransactionForm smartContract={this.state.smartContract}/>
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
