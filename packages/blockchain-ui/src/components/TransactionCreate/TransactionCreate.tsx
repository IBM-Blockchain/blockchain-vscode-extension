import React, { Component } from 'react';
import './TransactionCreate.scss';
import Sidebar from '../TransactionSidebar/TransactionSidebar';
import Utils from '../../Utils';
import { Button, Form, FormGroup, TextInput, Select, SelectItem, Checkbox, TextArea } from 'carbon-components-react';
import ITransaction from '../../interfaces/ITransaction';
import ISmartContract from '../../interfaces/ISmartContract';

interface CreateProps {
    activeSmartContract: ISmartContract;
}

interface CreateState {
    activeSmartContract: ISmartContract;
    transactionArguments: string;
}

class TransactionCreate extends Component<CreateProps, CreateState> {
    constructor(props: Readonly<CreateProps>) {
        super(props);
        this.state = {
            activeSmartContract: this.props.activeSmartContract,
            transactionArguments: ''
        };
        this.getTransactionArguments = this.getTransactionArguments.bind(this);
        this.updateTextArea = this.updateTextArea.bind(this);
    }

    public getTransactionArguments(event: React.FormEvent<HTMLSelectElement>): void {
        const transaction: ITransaction | undefined = this.state.activeSmartContract.transactions.find((txn: ITransaction) => txn.name === event.currentTarget.value);

        let templateText: string = '';

        if (transaction !== undefined) {
            for (let i: number = 0; i < transaction.parameters.length; i++) {
                templateText += (transaction.parameters[i].name + ': \n');
            }
            this.setState({
                transactionArguments: templateText
            });
        }
    }

    public render(): any {
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
                                            <SelectItem disabled={false} hidden={false} text='Peer 1, Peer 2' value='peer-1-and-2'/>
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
                    </div>
                </div>
            </div>
        );
    }

    private populateTransactionSelect(): any {
        const options: any = [];
        options.push(<SelectItem disabled={false} hidden={true} text='Select the transaction name' value='placeholder-item'/>);

        for (const txn of this.state.activeSmartContract.transactions) {
            options.push(<SelectItem disabled={false} hidden={false} text={txn.name} value={txn.name}/>);
        }

        return options;
    }

    private updateTextArea(event: React.FormEvent<HTMLTextAreaElement>): void {
        this.setState({
            transactionArguments: event.currentTarget.value
        });
    }

    private getTransactionOutput(): any {
        return (
            <div>
                <p>Transaction output</p>
                <p>More transaction output</p>
                <p>Even more transaction output</p>
                <p>A really really really long piece of transaction output</p>
            </div>
        );
    }

}

export default TransactionCreate;
