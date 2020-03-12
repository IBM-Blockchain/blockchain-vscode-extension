import React, { Component } from 'react';
import './TransactionForm.scss';
import { Button, Form, FormGroup, TextInput, Select, SelectItem, Checkbox, TextArea } from 'carbon-components-react';
import ITransaction from '../../../interfaces/ITransaction';
import ISmartContract from '../../../interfaces/ISmartContract';

interface IProps {
    smartContract: ISmartContract;
    postMessageHandler: (command: string, data?: any) => void;
}

interface IState {
    smartContract: ISmartContract;
    postMessageHandler: (command: string, data?: any) => void;
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
            transientData: '',
            postMessageHandler: this.props.postMessageHandler
        };
        this.generateTransactionArguments = this.generateTransactionArguments.bind(this);
        this.updateTransactionArguments = this.updateTransactionArguments.bind(this);
        this.updateTransientData = this.updateTransientData.bind(this);
        this.submitTxn = this.submitTxn.bind(this);
    }

    populateTransactionSelect(): Array<JSX.Element> {
        const options: Array<JSX.Element> = [];
        options.push(<SelectItem disabled={false} hidden={true} text='Select the transaction name' value='placeholder-item'/>);

        for (const txn of this.state.smartContract.transactions) {
            options.push(<SelectItem disabled={false} hidden={false} text={txn.name} value={txn.name}/>);
        }

        return options;
    }

    generateTransactionArguments(event: React.FormEvent<HTMLSelectElement>): void {
        const transactionArray: Array<ITransaction> = this.state.smartContract.transactions;
        const transaction: ITransaction | undefined = transactionArray.find((txn: ITransaction) => txn.name === event.currentTarget.value);
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

        const command: string = evaluate ? 'evaluate' : 'submit';
        const args: string = this.parseArgs(activeTransaction, this.state.transactionArguments);

        const transactionData: any = {
            smartContract: this.state.smartContract.name,
            transactionName: activeTransaction.name,
            channelName: this.state.smartContract.channel,
            args: args,
            namespace: this.state.smartContract.namespace,
            transientData: this.state.transientData,
            evaluate: evaluate,
            peerTargetNames: []
        };

        this.state.postMessageHandler(command, transactionData);
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
                    <Select id='transaction-name-select' labelText='Transaction name*' className='select-width' onChange={this.generateTransactionArguments}>
                        {this.populateTransactionSelect()}
                    </Select>
                </FormGroup>
                <FormGroup legendText='Peer targeting' id='target-peer-input'>
                    <Checkbox id='target-peer-checkbox' labelText='Target custom peer'/>
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
                    <Button size='field' className='submit-and-evaluate-buttons' id='evaluate-button' disabled={shouldDisableButtons} onClick={(): void => this.submitTxn(true)}>Evaluate</Button>
                    <Button size='field' className='submit-and-evaluate-buttons' id='submit-button' disabled={shouldDisableButtons} onClick={(): void => this.submitTxn(false)}>Submit</Button>
                </FormGroup>
            </Form>
        );
    }
}

export default TransactionForm;
