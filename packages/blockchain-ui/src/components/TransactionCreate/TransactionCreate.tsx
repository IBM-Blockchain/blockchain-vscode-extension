import React, { Component } from 'react';
import './TransactionCreate.scss';
import Sidebar from '../TransactionSidebar/TransactionSidebar';
import Utils from '../../Utils';
import { Button, Form, FormGroup, TextInput, Select, SelectItem, Checkbox, TextArea } from 'carbon-components-react';
import ITransaction from '../../interfaces/ITransaction';
import ISmartContract from '../../interfaces/ISmartContract';

interface CreateProps {
    activeSmartContract: ISmartContract;
    postMessageHandler: (message: {command: string, data: any}) => void;
}

interface CreateState {
    activeSmartContract: ISmartContract;
    activeTransaction: ITransaction | undefined;
    transactionArguments: string;
    postMessageHandler: (message: {command: string, data: any}) => void;
}

class TransactionCreate extends Component<CreateProps, CreateState> {
    constructor(props: Readonly<CreateProps>) {
        super(props);
        this.state = {
            activeSmartContract: this.props.activeSmartContract,
            activeTransaction: undefined,
            transactionArguments: '',
            postMessageHandler: this.props.postMessageHandler
        };
        this.getTransactionArguments = this.getTransactionArguments.bind(this);
        this.updateTextArea = this.updateTextArea.bind(this);
        this.submitTxn = this.submitTxn.bind(this);
    }

    getTransactionArguments(event: React.FormEvent<HTMLSelectElement>): void {
        const transactionArray: Array<ITransaction> = this.state.activeSmartContract.transactions;
        const transaction: ITransaction | undefined = transactionArray.find((txn: ITransaction) => txn.name === event.currentTarget.value);

        if (transaction !== undefined) {
            let templateText: string = '';
            if (transaction.parameters.length) {
                templateText += '[\n';
                for (const param of transaction.parameters) {
                    templateText += (`  ${param.name}: "",\n`);
                }
                templateText = templateText.substring(0, templateText.length - 2);
                templateText += '\n]';
            }

            this.setState({
                activeTransaction: transaction,
                transactionArguments: templateText
            });
        }
    }

    populateTransactionSelect(): JSX.Element {
        const options: any = [];
        options.push(<SelectItem disabled={false} hidden={true} text='Select the transaction name' value='placeholder-item'/>);

        for (const txn of this.state.activeSmartContract.transactions) {
            options.push(<SelectItem disabled={false} hidden={false} text={txn.name} value={txn.name}/>);
        }

        return options;
    }

    updateTextArea(event: React.FormEvent<HTMLTextAreaElement>): void {
        this.setState({
            transactionArguments: event.currentTarget.value
        });
    }

    submitTxn(evaluate: boolean): void {
        const activeTransaction: ITransaction = this.state.activeTransaction as ITransaction;

        const args: string = this.parseArgs(activeTransaction, this.state.transactionArguments);

        const transactionObject: any = {
            command: 'submit',
            data: {
                smartContract: this.state.activeSmartContract.name,
                transactionName: activeTransaction.name,
                channelName: this.state.activeSmartContract.channel,
                args: args,
                namespace: this.state.activeSmartContract.namespace,
                transientData: '',
                evaluate: evaluate,
                peerTargetNames: []
            }
        };

        this.state.postMessageHandler(transactionObject);
    }

    parseArgs(activeTransaction: ITransaction, transactionArguments: string): string {
        let parsedArguments: string = transactionArguments.replace(/\n/g, '');
        for (const param of activeTransaction.parameters) {
            parsedArguments = parsedArguments.replace(`${param.name}: `, '');
        }
        return parsedArguments;
    }

    getTransactionOutput(): JSX.Element {
        return (
            <div>
                <p>Transaction output</p>
                <p>More transaction output</p>
                <p>Even more transaction output</p>
                <p>A really really really long piece of transaction output</p>
            </div>
        );
    }

    render(): JSX.Element {
        const shouldDisableButtons: boolean = this.state.activeTransaction === undefined;

        return (
            <div className='page-container bx--grid' data-test-id='txn-page'>
                <div className='inner-container bx--row'>
                    <Sidebar/>
                    <div className='page-contents bx--col'>
                        <div className='titles-container'>
                        <span className='home-link' onClick={(): void => Utils.changeRoute('/transaction')}>{this.state.activeSmartContract.label} home</span>
                        </div>
                        <div className='contents-container bx--row'>
                            <div className='bx--col-lg-11'>
                                <Form id='create-txn-form'>
                                    <FormGroup legendText='Transaction label'>
                                        <div className='bx--row inline-row hide-label'>
                                            <TextInput id='transaction-label-input' labelText='Enter transaction label' hideLabel={true} defaultValue='Enter transaction label'></TextInput>
                                            <Button id='save-txn-button' size='field'>Save</Button>
                                        </div>
                                    </FormGroup>
                                    <FormGroup legendText='Transaction name'>
                                        <Select id='transaction-name-select' labelText='Transaction name' className='select-width' onChange={this.getTransactionArguments}>
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
                                        <TextArea labelText='Arguments' id='arguments-text-area' onChange={this.updateTextArea} value={this.state.transactionArguments}/>
                                    </FormGroup>
                                    <FormGroup legendText='Transient data'>
                                    <TextInput id='transient-data-input' labelText='Transient data' hideLabel={true}></TextInput>
                                    </FormGroup>
                                </Form>
                            </div>
                            <div className='bx--col-lg-5'>
                                <div>Transaction output</div>
                                <div className='txn-output-container' id='txn-output-container'>
                                    {this.getTransactionOutput()}
                                </div>
                            </div>
                        </div>
                        <div className='bx--row'>
                            <Button size='field' id='evaluate-button' disabled={shouldDisableButtons}>Evaluate</Button>
                            <Button size='field' id='submit-button' disabled={shouldDisableButtons} onClick={(): void => this.submitTxn(false)}>Submit</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

export default TransactionCreate;
