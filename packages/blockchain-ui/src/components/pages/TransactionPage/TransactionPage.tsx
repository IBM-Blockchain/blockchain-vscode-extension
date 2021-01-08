import React, { Component } from 'react';
import './TransactionPage.scss';
import TransactionInputContainer from '../../elements/TransactionInputContainer/TransactionInputContainer';
import TransactionOutput from '../../elements/TransactionOutput/TransactionOutput';
import TransactionContractPicker from '../../elements/TransactionContractPicker/TransactionContractPicker';
import ISmartContract from '../../../interfaces/ISmartContract';
import IAssociatedTxdata from '../../../interfaces/IAssociatedTxdata';
import ITransaction from '../../../interfaces/ITransaction';

interface IProps {
    transactionViewData: {
        gatewayName: string,
        smartContracts: ISmartContract[],
        preselectedSmartContract: ISmartContract | undefined,
        associatedTxdata: IAssociatedTxdata,
        preselectedTransaction: ITransaction
    };
    transactionOutput: string;
}

interface IState {
    gatewayName: string;
    smartContracts: ISmartContract[];
    preselectedSmartContract: ISmartContract | undefined;
    associatedTxdata: IAssociatedTxdata;
    transactionOutput: string;
    activeSmartContract: ISmartContract | undefined;
    transactionSubmitted: boolean;
}

class TransactionPage extends Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        const { transactionViewData: { gatewayName, smartContracts, preselectedSmartContract, associatedTxdata }, transactionOutput } = this.props;
        this.state = {
            gatewayName,
            smartContracts,
            associatedTxdata,
            transactionOutput,
            preselectedSmartContract,
            // If only a single smartContract is given, force it to be active
            activeSmartContract: smartContracts.length === 1 ? smartContracts[0] : preselectedSmartContract,
            transactionSubmitted: false,
        };
    }

    componentDidUpdate(prevProps: IProps): void {
        const { transactionViewData: { associatedTxdata, smartContracts, preselectedSmartContract }, transactionOutput } = this.props;
        const { activeSmartContract } = this.state;

        if (prevProps.transactionViewData.smartContracts !== smartContracts) {
            if (activeSmartContract) {
                let newActiveSmartContract: ISmartContract | undefined;
                if (!smartContracts || smartContracts.length === 0) {
                    newActiveSmartContract = undefined;
                } else if (smartContracts.length === 1) {
                    newActiveSmartContract = smartContracts[0];
                } else {
                    newActiveSmartContract = smartContracts.find(({ name, contractName }) => name === activeSmartContract.name && contractName === activeSmartContract.contractName);
                }

                this.setState({
                    smartContracts,
                    activeSmartContract: newActiveSmartContract,
                });
            } else {
                this.setState({
                    smartContracts,
                });
            }
        }

        // Only make the preselectedSmartContract active if it exists within the smartContracts array
        if (preselectedSmartContract && prevProps.transactionViewData.preselectedSmartContract !== preselectedSmartContract) {
            this.setState({
                preselectedSmartContract,
                activeSmartContract: preselectedSmartContract,
            });
        }

        if (prevProps.transactionViewData.associatedTxdata !== associatedTxdata) {
            this.setState({
                associatedTxdata,
            });
        }

        if (prevProps.transactionOutput !== transactionOutput) {
            this.setTransactionSubmitted(false);
            this.setState({
                transactionOutput,
            });
        }
    }

    createBreadcrumb(gatewayName: string, smartContract: ISmartContract | undefined, multipleContracts: boolean): string[] {
        const breadcrumb: string[] = [gatewayName];
        if (smartContract) {
            breadcrumb.push(smartContract.channel, smartContract.label);
            if (smartContract.contractName && multipleContracts) {
                breadcrumb.push(smartContract.contractName);
            }
        }
        return breadcrumb;
    }

    smartContractChanged({ selectedItem }: { selectedItem: string }): void {
        const { smartContracts } = this.state;
        const newActiveContract: ISmartContract = smartContracts.find(({ contractName }) => contractName === selectedItem) as ISmartContract;
        this.setState({
            activeSmartContract: newActiveContract,
        });
    }

    setTransactionSubmitted(transactionSubmitted: boolean): void {
        this.setState({
            transactionSubmitted,
        })
    }

    render(): JSX.Element {
        const { preselectedTransaction } = this.props.transactionViewData;
        const { gatewayName, smartContracts, associatedTxdata, transactionOutput, activeSmartContract, transactionSubmitted } = this.state;

        const breadcrumb: Array<string> = this.createBreadcrumb(gatewayName, activeSmartContract, smartContracts && smartContracts.length > 1);
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
                                {smartContracts.length > 1 && (
                                    <TransactionContractPicker
                                        smartContracts={smartContracts}
                                        activeContract={activeSmartContract}
                                        onChange={(data: any) => this.smartContractChanged(data)}
                                    />
                                )}
                                <TransactionInputContainer
                                    smartContract={activeSmartContract}
                                    associatedTxdata={associatedTxdata}
                                    preselectedTransaction={preselectedTransaction}
                                    setTransactionSubmitted={(isSubmitted: boolean) => this.setTransactionSubmitted(isSubmitted)}
                                />
                            </div>
                            <div className='bx--col-lg-10 bx--col-md-4 bx--col-sm-4'>
                                <TransactionOutput output={transactionOutput} isLoading={transactionSubmitted} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

export default TransactionPage;
