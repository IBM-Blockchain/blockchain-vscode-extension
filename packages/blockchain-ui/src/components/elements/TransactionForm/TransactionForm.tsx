import React, { Component } from 'react';
import './TransactionForm.scss';
import { Button, Dropdown, Form, FormGroup, Select, SelectItem, TextArea, TextInput } from 'carbon-components-react';
import ITransaction from '../../../interfaces/ITransaction';
import ISmartContract from '../../../interfaces/ISmartContract';
import { ExtensionCommands } from '../../../ExtensionCommands';
import Utils from '../../../Utils';

interface IProps {
    smartContract: ISmartContract;
}

interface IState {
    smartContract: ISmartContract;
    activeTransaction: ITransaction | undefined;
    transactionArguments: string;
    transientData: string;
}

class TransactionForm extends Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            smartContract: this.props.smartContract,
            activeTransaction: undefined,
            transactionArguments: '',
            transientData: ''
        };
        this.populateTransactionDropdown = this.populateTransactionDropdown.bind(this);
        this.generateTransactionArguments = this.generateTransactionArguments.bind(this);
        this.updateTransactionArguments = this.updateTransactionArguments.bind(this);
        this.updateTransientData = this.updateTransientData.bind(this);
        this.submitTxn = this.submitTxn.bind(this);
    }

    populateTransactionDropdown(): string[] {
        const txnDropdownItems: string[] = [];
        for (const txn of this.state.smartContract.transactions) {
            txnDropdownItems.push(txn.name);
        }
        return txnDropdownItems;
    }

    generateTransactionArguments(data: any): void {
        const transactionArray: Array<ITransaction> = this.state.smartContract.transactions;
        const transaction: ITransaction | undefined = transactionArray.find((txn: ITransaction) => txn.name === data.selectedItem);
        if (transaction !== undefined) {
            let transactionArguments: string = '';
            if (transaction.parameters.length) {
                transactionArguments += '[\n';
                for (const param of transaction.parameters) {
                    transactionArguments += (`  ${param.name}: "",\n`);
                }
                transactionArguments = transactionArguments.substring(0, transactionArguments.length - 2);
                transactionArguments += '\n]';
            }

            this.updateActiveTransaction(transaction, transactionArguments);
        }
    }

    updateActiveTransaction(transaction: ITransaction, transactionArguments: string): void {
        this.setState({
            activeTransaction: transaction,
            transactionArguments: transactionArguments
        });
    }

    updateTransactionArguments(event: React.FormEvent<HTMLTextAreaElement>): void {
        this.setState({
            transactionArguments: event.currentTarget.value
        });
    }

    updateTransientData(event: React.FormEvent<HTMLInputElement>): void {
        this.setState({
            transientData: event.currentTarget.value
        });
    }

    parseArgs(activeTransaction: ITransaction, transactionArguments: string): string {
        let parsedArguments: string = transactionArguments.replace(/\n/g, '');
        for (const param of activeTransaction.parameters) {
            parsedArguments = parsedArguments.replace(`${param.name}: `, '');
        }
        return parsedArguments;
    }

    submitTxn(evaluate: boolean): void {
        const activeTransaction: ITransaction = this.state.activeTransaction as ITransaction;

        const command: string = evaluate ? ExtensionCommands.EVALUATE_TRANSACTION : ExtensionCommands.SUBMIT_TRANSACTION;
        const args: string = this.parseArgs(activeTransaction, this.state.transactionArguments);

        const data: any = {
            smartContract: this.state.smartContract.name,
            transactionName: activeTransaction.name,
            channelName: this.state.smartContract.channel,
            args,
            namespace: this.state.smartContract.namespace,
            transientData: this.state.transientData,
            evaluate,
            peerTargetNames: []
        };
        Utils.postToVSCode({command, data});
    }

    render(): JSX.Element {
        const shouldDisableButtons: boolean = this.state.activeTransaction === undefined;

        return (
            <Form id='create-txn-form'>
                <FormGroup legendText='Transaction label'>
                    <div className='bx--row inline-row hide-label'>
                        <TextInput id='transaction-label-input' labelText='Enter transaction label' hideLabel={true} placeholder='Enter transaction label'></TextInput>
                        <Button id='save-txn-button' size='field'>Save</Button>
                    </div>
                </FormGroup>
                <FormGroup legendText='Transaction name'>
                    <Dropdown
                        ariaLabel='dropdown'
                        id='transaction-select'
                        invalidText='A valid value is required'
                        items={this.populateTransactionDropdown()}
                        label='Select the transaction name'
                        titleText='Transaction name*'
                        type='default'
                        selectedItem={this.state.activeTransaction ? this.state.activeTransaction.name : 'Select the transaction name'}
                        onChange={this.generateTransactionArguments}
                    />
                </FormGroup>
                <FormGroup legendText='Peer targeting' id='target-peer-input'>
                    <Select id='peers-select' labelText='Peers' className='select-width hide-label'>
                        <SelectItem disabled={false} hidden={false} text='Select a peer' value='select-a-peer'/>
                    </Select>
                </FormGroup>
                <FormGroup legendText='Arguments'>
                    <TextArea labelText='Arguments*' id='arguments-text-area' onChange={this.updateTransactionArguments} value={this.state.transactionArguments}/>
                </FormGroup>
                <FormGroup legendText='Transient data'>
                    <TextInput id='transient-data-input' labelText='Transient data (optional) - e.g. {"key": "value"}' hideLabel={false} onChange={this.updateTransientData} value={this.state.transientData}></TextInput>
                </FormGroup>
                <FormGroup legendText='Submit and Evaluate buttons' id='submit-and-evaluate-buttons'>
                    <div className='submit-txn-button-container'>
                        <Button size='field' className='submit-txn-button' id='evaluate-button' disabled={shouldDisableButtons} onClick={(): void => this.submitTxn(true)}>Evaluate</Button>
                        <div className='button-separator'/>
                        <Button size='field' className='submit-txn-button' id='submit-button' disabled={shouldDisableButtons} onClick={(): void => this.submitTxn(false)}>Submit</Button>
                    </div>
                </FormGroup>
            </Form>
        );
    }
}

export default TransactionForm;
