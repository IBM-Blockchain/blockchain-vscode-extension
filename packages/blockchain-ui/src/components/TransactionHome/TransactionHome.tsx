import React, { Component } from 'react';
import './TransactionHome.scss';
import { SelectItem } from 'carbon-components-react';
import InlineSelect from '../InlineSelect/InlineSelect';
import TransactionTable from '../TransactionTable/TransactionTable';
import ISmartContract from '../../interfaces/ISmartContract';

interface HomeProps {
    gatewayName: string;
    activeSmartContract: ISmartContract;
    smartContracts: Array<ISmartContract>;
    switchSmartContract: (newActiveContract: string) => void;
    postMessageHandler: (command: string, data?: any) => void;
}

interface HomeState {
    gatewayName: string;
    activeSmartContractLabel: string;
    smartContractLabels: Array<string>;
    switchSmartContract: (newActiveContract: string) => void;
    postMessageHandler: (command: string, data?: any) => void;
}

class TransactionHome extends Component<HomeProps, HomeState> {

    constructor(props: Readonly<HomeProps>) {
        super(props);
        this.state = this.setUpState(this.props);
        this.smartContractSelectChangeHandler = this.smartContractSelectChangeHandler.bind(this);
    }

    componentDidUpdate(prevProps: HomeProps): void {
        if (prevProps.activeSmartContract.label !== this.props.activeSmartContract.label) {
            this.setState({
                activeSmartContractLabel: this.props.activeSmartContract.label
            });
        }
    }

    setUpState(receivedProps: HomeProps): HomeState {
        const contractLabels: Array<string> = [];
        for (const contract of receivedProps.smartContracts) {
            contractLabels.push(contract.label);
        }

        return {
            gatewayName: receivedProps.gatewayName,
            activeSmartContractLabel: receivedProps.activeSmartContract.label,
            smartContractLabels: contractLabels,
            switchSmartContract: receivedProps.switchSmartContract,
            postMessageHandler: receivedProps.postMessageHandler
        };
    }

    smartContractSelectChangeHandler(event: React.FormEvent<HTMLSelectElement>): void {
        const newSmartContractLabel: string = event.currentTarget.value;
        this.state.switchSmartContract(newSmartContractLabel);
    }

    populateSmartContractSelect(): Array<JSX.Element> {
        const options: Array<JSX.Element> = [];
        options.push(<SelectItem disabled={false} hidden={true} text={this.state.activeSmartContractLabel} value={this.state.activeSmartContractLabel}/>);
        for (const contract of this.state.smartContractLabels) {
            options.push(<SelectItem disabled={false} hidden={false} text={contract} value={contract}/>);
        }
        return options;
    }

    getRecentTransactions(): Array<any> {
        return [
            {
                id: '1',
                name: 'createAsset',
                arguments: 'AssetID: myAsset01',
                timestamp: '1:15pm',
                result: '✅'
            },
            {
                id: '2',
                name: 'readAsset',
                arguments: 'AssetID: myAsset01',
                timestamp: '1:32pm',
                result: '✅'
            },
            {
                id: '3',
                name: 'updateAsset',
                arguments: 'AssetID: myAsset01',
                timestamp: '1:42pm',
                result: '✅'
            },
            {
                id: '4',
                name: 'deleteAsset',
                arguments: 'AssetID: myAsset01',
                timestamp: '1:59pm',
                result: '✅'
            }
        ];
    }

    render(): JSX.Element {
        const tableRows: Array<any> = this.getRecentTransactions();

        return (
            <div className='page-container bx--grid' data-test-id='txn-page'>
                <div className='inner-container'>
                    <div className='page-contents'>
                        <div className='titles-container'>
                            <InlineSelect id='smart-contract-select' labelText='Smart contract' contents={this.populateSmartContractSelect()} onChangeCallback={this.smartContractSelectChangeHandler}/>
                            <h2>Transactions view for {this.state.gatewayName}</h2>
                        </div>
                        <div className='contents-container bx--row'>
                            <p>Welcome to the transaction webview for {this.state.activeSmartContractLabel}. View, submit and evaluate transactions, as well as import and export them. Navigate to alternative smart contracts under {this.state.gatewayName} through the top left.</p>
                            <br/>
                            <TransactionTable
                                id={'recent-txns-table'}
                                title={'Recent Transactions'}
                                description={'View your recent transactions, unused transactions will clear every 50 submitted.'}
                                rows={tableRows}
                                buttonId={'recent-txns-table-btn'}
                                buttonText={'Create a new transaction'}
                                buttonFunction={(): void => this.state.postMessageHandler('create')}
                            />
                        </div>
                        <br></br>
                        <div className='contents-container bx--row'>
                            <TransactionTable
                                id={'saved-txns-table'}
                                title={'Saved templates'}
                                description={'View your saved templates'}
                                rows={[{id: '1', name: 'No transaction templates saved'}]}
                                buttonId={'saved-txns-table-btn'}
                                buttonText={'Import a transaction'}
                                buttonFunction={(): void => this.state.postMessageHandler('import')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default TransactionHome;
