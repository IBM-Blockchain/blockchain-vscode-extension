import React, { Component } from 'react';
import './TransactionCreate.scss';
import Sidebar from '../TransactionSidebar/TransactionSidebar';
import { Button, Form, FormGroup, TextInput, Select, SelectItem, Checkbox, TextArea } from 'carbon-components-react';

class TransactionCreate extends Component {

    public render(): any {
        return (
            <div className='page-container bx--grid' data-test-id='txn-page'>
                <div className='inner-container bx--row'>
                    <Sidebar/>
            <div className='page-contents bx--col'>
                <div className='titles-container'>
                    <span>smartContract@0.0.1 home</span>
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
                                <Select id='transaction-name-select' labelText='Transaction name' className='select-width'>
                                    <SelectItem disabled={false} hidden={false} text='Create Penguin' value='create-penguin'/>
                                    <SelectItem disabled={false} hidden={false} text='Read Penguin' value='read-penguin'/>
                                    <SelectItem disabled={false} hidden={false} text='Update Penguin' value='update-penguin'/>
                                    <SelectItem disabled={false} hidden={false} text='Delete Penguin' value='delete-penguin'/>
                                    <SelectItem disabled={false} hidden={false} text='Penguin Exists' value='penguin-exists'/>
                                </Select>
                            </FormGroup>
                            <FormGroup legendText='Peer targeting' id='target-peer-input'>
                                <Checkbox id='target-peer-checkbox' labelText='Target custom peer'/>
                                <Select id='peers-select' labelText='Peers' className='select-width hide-label'>
                                    <SelectItem disabled={false} hidden={false} text='Peer 1, Peer 2' value='peer-1-and-2'/>
                                </Select>
                            </FormGroup>
                            <FormGroup legendText='Arguments'>
                                <TextArea labelText='Arguments'/>
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
