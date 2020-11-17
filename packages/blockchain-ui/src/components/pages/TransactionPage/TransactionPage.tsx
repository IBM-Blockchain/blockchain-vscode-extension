import React, { Component } from 'react';
import './TransactionPage.scss';
import TransactionInputContainer from '../../elements/TransactionInputContainer/TransactionInputContainer';
import TransactionOutput from '../../elements/TransactionOutput/TransactionOutput';
import ISmartContract from '../../../interfaces/ISmartContract';
import IAssociatedTxdata from '../../../interfaces/IAssociatedTxdata';
import IDataFileTransaction from '../../../interfaces/IDataFileTransaction';
import ITransaction from '../../../interfaces/ITransaction';

interface IProps {
    transactionViewData: {gatewayName: string, smartContract: ISmartContract, associatedTxdata: IAssociatedTxdata | undefined, txdataTransactions: IDataFileTransaction[], preselectedTransaction: ITransaction };
    transactionOutput: string;
}

interface IState {
    gatewayName: string;
    smartContract: ISmartContract;
    associatedTxdata: IAssociatedTxdata | undefined;
    txdataTransactions: IDataFileTransaction[];
    transactionOutput: string;
}

class TransactionPage extends Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        const { transactionViewData: { gatewayName, smartContract, associatedTxdata, txdataTransactions }, transactionOutput } = this.props;
        this.state = {
            gatewayName,
            smartContract,
            associatedTxdata,
            txdataTransactions,
            transactionOutput,
        };
    }

    componentDidUpdate(prevProps: IProps): void {
        const { transactionViewData: { associatedTxdata, txdataTransactions }, transactionOutput } = this.props;
        if (prevProps.transactionViewData.associatedTxdata !== associatedTxdata) {
            this.setState({
                associatedTxdata,
                txdataTransactions,
            });
        }

        if (prevProps.transactionOutput !== transactionOutput) {
            this.setState({
                transactionOutput,
            });
        }
    }

    render(): JSX.Element {
        const { preselectedTransaction } = this.props.transactionViewData;
        const { gatewayName, smartContract, associatedTxdata, txdataTransactions, transactionOutput } = this.state;
        const breadcrumb: Array<string> = [gatewayName, smartContract.channel, smartContract.label];
        return (
            <div className='page-container bx--grid' data-test-id='txn-page'>
                <div className='inner-container'>
                    <div className='page-contents contents-container'>
                        <div className='bx--row'>
                            <div className='titles-container'>
                                <p className='breadcrumb'>
                                    Transacting with: {breadcrumb.map((str) => <>{str}<span className='breadcrumb-divider'>/</span></>)}
                                </p>
                                <h2>Create transaction</h2>
                            </div>
                        </div>
                        <div className='bx--row'>
                            <div className='bx--col-lg-6 bx--col-md-4 bx--col-sm-4'>
                                <TransactionInputContainer
                                    smartContract={smartContract}
                                    associatedTxdata={associatedTxdata}
                                    txdataTransactions={txdataTransactions}
                                    preselectedTransaction={preselectedTransaction}
                                />
                            </div>
                            <div className='bx--col-lg-10 bx--col-md-4 bx--col-sm-4'>
                                <TransactionOutput output={transactionOutput}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

export default TransactionPage;
