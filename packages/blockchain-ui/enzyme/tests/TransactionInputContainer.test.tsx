// tslint:disable no-unused-expression
import React from 'react';
import {act} from 'react-dom/test-utils';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import { ContentSwitcher, Dropdown, MultiSelect, FileUploaderItem } from 'carbon-components-react';
import TransactionInputContainer from '../../src/components/elements/TransactionInputContainer/TransactionInputContainer';
import TransactionManualInput from '../../src/components/elements/TransactionManualInput/TransactionManualInput';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import Utils from '../../src/Utils';
import { ExtensionCommands } from '../../src/ExtensionCommands';
import IAssociatedTxdata from '../../src/interfaces/IAssociatedTxdata';
import IDataFileTransaction from '../../src/interfaces/IDataFileTransaction';
import ITransactionManualInput from '../../src/interfaces/ITransactionManualInput';
chai.should();
chai.use(sinonChai);

const transactionNameSelector: any = Dropdown;
const transactionParametersSelector: any = '#arguments-text-area';
const transientDataSelector: any = '#transient-data-input';

function toggleContentSwitcher(component: any): any {
    act(() => {
        component.find(ContentSwitcher).prop('onChange')();
    });
    component = component.update();
    return component;
}

function updateManualInputValues(component: any, transactionName: string | undefined, transactionParameters: string | undefined, transientData: string | undefined): any {
    if (transactionName !== undefined) {
        const transactionInput: any = component.find(transactionNameSelector).at(0);
        act(() => {
            transactionInput.prop('onChange')({ selectedItem: transactionName });
        });
        component = component.update();
    }

    if (transactionParameters !== undefined) {
        const parameterInput: any = component.find(transactionParametersSelector).at(0);
        act(() => {
            parameterInput.prop('onChange')({ currentTarget: { value: transactionParameters }});
        });
        component = component.update();
    }

    if (transientData !== undefined) {
        const transientDataInput: any = component.find(transientDataSelector).at(0);
        act(() => {
            transientDataInput.prop('onChange')({ currentTarget: { value: transientData }});
        });
        component = component.update();
    }

    return component;
}

function updateDataInputValues(component: any, transactions: IDataFileTransaction | undefined): any {
    if (transactions !== undefined) {
        const transactionInput: any = component.find(transactionNameSelector);
        act(() => {
            transactionInput.prop('onChange')({ selectedItem: transactions });
        });
        component = component.update();
    }

    return component;
}

function updateSharedInputValues(component: any, selectedPeers: { id: string; label: string}[]): any {
    if (selectedPeers.length > 0) {

        const peersInput: any = component.find(MultiSelect);
        act(() => {
            peersInput.prop('onChange')({ selectedItems: selectedPeers });
        });

        component = component.update();
    }

    return component;
}

describe('TransactionInputContainer component', () => {
    let mySandbox: sinon.SinonSandbox;
    let postToVSCodeStub: sinon.SinonStub;
    let component: any;

    const transactionOne: ITransaction = {
        name: 'transactionOne',
        parameters: [{
            description: '',
            name: 'name',
            schema: {}
        }],
        returns: {
            type: ''
        },
        tag: ['submit']
    };

    const transactionTwo: ITransaction = {
        name: 'transactionTwo',
        parameters: [],
        returns: {
            type: ''
        },
        tag: ['submit']
    };

    const greenContract: ISmartContract = {
        name: 'greenContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'greenContract@0.0.1',
        transactions: [transactionOne, transactionTwo],
        namespace: 'GreenContract',
        peerNames: ['peer1', 'peer2']
    };

    const associatedTxdata: IAssociatedTxdata = {
        chaincodeName: 'chaincodeName',
        channelName: 'channelName',
        transactionDataPath: 'transactionDataPath',
    };

    const txdataTransactions: IDataFileTransaction[] = [{
        transactionName: transactionOne.name,
        transactionLabel: transactionOne.name,
        txDataFile: 'transactionData.txdata',
        arguments: ['arg1', 'arg2'],
        transientData: { key: 'value' }
    }];

    const preselectedTransaction: ITransaction = {
        name: '',
        parameters: [],
        returns: { type: '' },
        tag: [],
    };

    beforeEach(async () => {
        mySandbox = sinon.createSandbox();
        postToVSCodeStub = mySandbox.stub(Utils, 'postToVSCode');
    });

    afterEach(async () => {
        mySandbox.restore();
    });

    it('should render the expected snapshot', () => {
        const snapshotComponent: any = renderer
            .create(<TransactionInputContainer smartContract={greenContract} associatedTxdata={associatedTxdata} txdataTransactions={txdataTransactions} preselectedTransaction={preselectedTransaction} />)
            .toJSON();
        expect(snapshotComponent).toMatchSnapshot();
    });

    describe('Content switcher', () => {
        beforeEach(() => {
            component = mount(<TransactionInputContainer smartContract={greenContract} associatedTxdata={associatedTxdata} txdataTransactions={txdataTransactions} preselectedTransaction={preselectedTransaction} />);
        });

        it('shows the manual input by default', () => {
            const parameterTextArea: any = component.find(transactionParametersSelector);
            const filePicker: any = component.find(FileUploaderItem);
            expect(parameterTextArea.exists()).toBeTruthy();
            expect(filePicker.exists()).toBeFalsy();
        });

        it('shows the data file input when toggled', () => {
            component = toggleContentSwitcher(component);
            const parameterTextArea: any = component.find(transactionParametersSelector);
            const filePicker: any = component.find(FileUploaderItem);
            expect(parameterTextArea.exists()).toBeFalsy();
            expect(filePicker.exists()).toBeTruthy();
        });

        ['content-switch-manual', 'content-switch-data'].map((dataId) => {
            it('switch component does nothing when either the onClick or onKeyDown functions are called', () => {
                let switchComponent: any = component.find(`[data-testid="${dataId}"]`).at(1);
                switchComponent.simulate('click');
                component = component.update();
                switchComponent = component.find(`[data-testid="${dataId}"]`).at(1);
                switchComponent.prop('onKeyDown')({ key: 'Enter' });
                component = component.update();
                expect(component.matchesElement(<TransactionInputContainer smartContract={greenContract} associatedTxdata={associatedTxdata} txdataTransactions={txdataTransactions} preselectedTransaction={preselectedTransaction} />)).toEqual(true);
            });
        });
    });

    describe('Manual input', () => {
        beforeEach(() => {
            component = mount(<TransactionInputContainer smartContract={greenContract} associatedTxdata={associatedTxdata} txdataTransactions={txdataTransactions} preselectedTransaction={preselectedTransaction}/>);
        });

        it('updates the dropdown when the transaction is chosen', () => {
            let dropdown: any = component.find(transactionNameSelector);
            let manualInput: any = component.find(TransactionManualInput);
            let manualInputState: ITransactionManualInput = manualInput.prop('manualInputState');

            expect(dropdown.prop('selectedItem')).toEqual('Select the transaction name');
            expect(manualInputState.activeTransaction).toEqual({ name: '', parameters: [], returns: { type: '' }, tag: [] });

            component = updateManualInputValues(component, 'transactionOne', undefined, undefined);

            dropdown = component.find(transactionNameSelector);
            manualInput = component.find(TransactionManualInput);
            manualInputState = manualInput.prop('manualInputState');
            expect(manualInputState.activeTransaction).toHaveProperty('name', 'transactionOne');
            expect(dropdown.prop('selectedItem')).toEqual('transactionOne');
        });

        it('sets the activeTransaction to the preselectedTransaction prop when it is passed in', () => {
            const selectedTransaction: ITransaction = greenContract.transactions[0];
            // Use a different component as we need to pass in the preselectedTransaction
            component = mount(<TransactionInputContainer smartContract={greenContract} associatedTxdata={associatedTxdata} txdataTransactions={txdataTransactions} preselectedTransaction={selectedTransaction} />);
            const dropdown: any = component.find(transactionNameSelector);
            const manualInput: any = component.find(TransactionManualInput);
            const manualInputState: ITransactionManualInput = manualInput.prop('manualInputState');

            expect(manualInputState.activeTransaction).toEqual(selectedTransaction);
            expect(dropdown.prop('selectedItem')).toEqual(selectedTransaction.name);
        });

        it('generates transaction arguments when an option from the transaction select is chosen', () => {
            component = updateManualInputValues(component, 'transactionOne', undefined, undefined);
            const textarea: any = component.find(transactionParametersSelector).at(0);
            expect(textarea.prop('value')).toEqual('{\n  "name": ""\n}');
            expect(textarea.prop('disabled')).toBeFalsy();
        });

        it('does not generate arguments in the event that the chosen transaction doesn\'t have any parameters', () => {
            component = updateManualInputValues(component, 'transactionTwo', undefined, undefined);
            const textarea: any = component.find(transactionParametersSelector).at(0);
            expect(textarea.prop('value')).toEqual('{}');
            expect(textarea.prop('disabled')).toBeFalsy();
        });

        it('does not generate arguments in the event that the chosen transaction doesn\'t exist', () => {
            component = updateManualInputValues(component, 'anotherTransaction', undefined, undefined);
            const textarea: any = component.find(transactionParametersSelector).at(0);
            expect(textarea.prop('value')).toEqual('{}');
            expect(textarea.prop('disabled')).toBeTruthy();
        });

        it('updates when the user types in the textarea', () => {
            let manualInput: any = component.find(TransactionManualInput);
            let manualInputState: ITransactionManualInput = manualInput.prop('manualInputState');

            expect(manualInputState.transactionArguments).toEqual([]);

            component = updateManualInputValues(component, undefined, '{"key": "the value"}', undefined);

            manualInput = component.find(TransactionManualInput);
            manualInputState = manualInput.prop('manualInputState');
            expect(manualInputState.transactionArguments).toEqual(['the value']);
        });

        it('updates when the user removes all args from the textarea', () => {
            let manualInput: any = component.find(TransactionManualInput);
            let manualInputState: ITransactionManualInput = manualInput.prop('manualInputState');

            expect(manualInputState.transactionArguments).toEqual([]);
            component = updateManualInputValues(component, undefined, '{"key": "the value"}', undefined);

            manualInput = component.find(TransactionManualInput);
            manualInputState = manualInput.prop('manualInputState');
            expect(manualInputState.transactionArguments).toEqual(['the value']);
            component = updateManualInputValues(component, undefined, '', undefined);

            manualInput = component.find(TransactionManualInput);
            manualInputState = manualInput.prop('manualInputState');
            expect(manualInputState.transactionArguments).toEqual([]);
        });

        it('updates when the user types in the transient data input box', () => {
            let manualInput: any = component.find(TransactionManualInput);
            let manualInputState: ITransactionManualInput = manualInput.prop('manualInputState');

            expect(manualInputState.transientData).toEqual('');

            component = updateManualInputValues(component, undefined, undefined, 'some transient data');

            manualInput = component.find(TransactionManualInput);
            manualInputState = manualInput.prop('manualInputState');
            expect(manualInputState.transientData).toEqual('some transient data');
        });

        it('should update state when a peer is selected', () => {
            let multiSelect: any = component.find(MultiSelect);
            let selectedValues: ITransactionManualInput = multiSelect.prop('initialSelectedItems');

            expect(selectedValues).toEqual([{ id: 'peer1', label: 'peer1' }, { id: 'peer2', label: 'peer2' }]);

            component = updateSharedInputValues(component, [{
                id: 'peer1',
                label: 'peer1'
            }]);

            multiSelect = component.find(MultiSelect);
            selectedValues = multiSelect.prop('initialSelectedItems');
            expect(selectedValues).toEqual([{ id: 'peer1', label: 'peer1' }]);
        });

        it('should attempt to submit a transaction when the submit button is clicked ', () => {
            component = updateManualInputValues(component, 'transactionOne', '{"key": "Green"}', undefined);

            component.find('#submit-button').at(0).simulate('click');

            postToVSCodeStub.should.have.been.calledOnceWithExactly({
                command: ExtensionCommands.SUBMIT_TRANSACTION,
                data: {
                    args: ['Green'],
                    channelName: 'mychannel',
                    evaluate: false,
                    namespace: 'GreenContract',
                    peerTargetNames: greenContract.peerNames,
                    smartContract: 'greenContract',
                    transactionName: 'transactionOne',
                    transientData: '',
                    txDataFile: undefined,
                }
            });
        });

        it('should attempt to evaluate a transaction when the evaluate button is clicked', () => {
            component = updateManualInputValues(component, 'transactionOne', '{"key": "Green"}', undefined);

            component.find('#evaluate-button').at(1).simulate('click');
            postToVSCodeStub.should.have.been.calledOnceWithExactly({
                command: ExtensionCommands.EVALUATE_TRANSACTION,
                data: {
                    args: ['Green'],
                    channelName: 'mychannel',
                    evaluate: true,
                    namespace: 'GreenContract',
                    peerTargetNames: greenContract.peerNames,
                    smartContract: 'greenContract',
                    transactionName: 'transactionOne',
                    transientData: '',
                    txDataFile: undefined,
                }
            });
        });

        it('should attempt to submit a transaction with transient data when the submit button is clicked ', () => {
            component = updateManualInputValues(component, 'transactionOne', '{"key": "Green"}', '{"some": "data"}');

            component.find('#submit-button').at(1).simulate('click');
            postToVSCodeStub.should.have.been.calledOnceWithExactly({
                command: ExtensionCommands.SUBMIT_TRANSACTION,
                data: {
                    args: ['Green'],
                    channelName: 'mychannel',
                    evaluate: false,
                    namespace: 'GreenContract',
                    peerTargetNames: greenContract.peerNames,
                    smartContract: 'greenContract',
                    transactionName: 'transactionOne',
                    transientData: '{"some": "data"}',
                    txDataFile: undefined,
                }
            });
        });

        it('should attempt to evaluate a transaction with transient data when the evaluate button is clicked', () => {
            component = updateManualInputValues(component, 'transactionOne', '{"key": "Green"}', '{"some": "data"}');

            component.find('#evaluate-button').at(1).simulate('click');
            postToVSCodeStub.should.have.been.calledOnceWithExactly({
                command: ExtensionCommands.EVALUATE_TRANSACTION,
                data: {
                    args: ['Green'],
                    channelName: 'mychannel',
                    evaluate: true,
                    namespace: 'GreenContract',
                    peerTargetNames: greenContract.peerNames,
                    smartContract: 'greenContract',
                    transactionName: 'transactionOne',
                    transientData: '{"some": "data"}',
                    txDataFile: undefined,
                }
            });
        });

        it('should attempt to submit a transaction with custom peers when the submit button is clicked', () => {
            component = updateManualInputValues(component, 'transactionOne', '{"key": "Green"}', '{"some": "data"}');

            component = updateSharedInputValues(component, [{
                id: 'peer1',
                label: 'peer1'
            }]);

            component.find('#submit-button').at(1).simulate('click');
            postToVSCodeStub.should.have.been.calledOnceWithExactly({
                command: ExtensionCommands.SUBMIT_TRANSACTION,
                data: {
                    args: ['Green'],
                    channelName: 'mychannel',
                    evaluate: false,
                    namespace: 'GreenContract',
                    peerTargetNames: ['peer1'],
                    smartContract: 'greenContract',
                    transactionName: 'transactionOne',
                    transientData: '{"some": "data"}',
                    txDataFile: undefined,
                }
            });
        });

        it('should attempt to submit a transaction with custom peers when the evaluate button is clicked', () => {
            component = updateManualInputValues(component, 'transactionOne', '{"key": "Green"}', '{"some": "data"}');

            component = updateSharedInputValues(component, [{
                id: 'peer1',
                label: 'peer1'
            }]);

            component.find('#evaluate-button').at(1).simulate('click');
            postToVSCodeStub.should.have.been.calledOnceWithExactly({
                command: ExtensionCommands.EVALUATE_TRANSACTION,
                data: {
                    args: ['Green'],
                    channelName: 'mychannel',
                    evaluate: true,
                    namespace: 'GreenContract',
                    peerTargetNames: ['peer1'],
                    smartContract: 'greenContract',
                    transactionName: 'transactionOne',
                    transientData: '{"some": "data"}',
                    txDataFile: undefined,
                }
            });
        });

        it('should not submit if no transaction has been selected as the submit button is disabled', () => {
            component = updateManualInputValues(component, undefined, '{"key": "Green"}', '{"some": "data"}');
            component.find('#submit-button').at(1).simulate('click');
            postToVSCodeStub.should.not.have.been.called;
        });

        it('should not submit if no transaction has been selected as the evaluate button is disabled', () => {
            component = updateManualInputValues(component, undefined, '{"key": "Green"}', '{"some": "data"}');
            component.find('#evaluate-button').at(1).simulate('click');
            postToVSCodeStub.should.not.have.been.called;
        });
    });

    describe('Data file input', () => {
        const selectTxData: string = '[data-testid="select-tx-data-dir"]';

        describe('Without associatedTxdata', () => {
            beforeEach(() => {
                component = mount(<TransactionInputContainer smartContract={greenContract} associatedTxdata={undefined} txdataTransactions={txdataTransactions} preselectedTransaction={preselectedTransaction}/>);
                component = toggleContentSwitcher(component);
            });

            it('should show the Button and hide the FileUploaderItem', () => {
                expect(component.find(FileUploaderItem).exists()).toBeFalsy();
                expect(component.find(selectTxData).exists()).toBeTruthy();
            });

            it('should call the ASSOCIATE_TRANSACTION_DATA_DIRECTORY vscode command when the Button is clicked', () => {
                component.find(selectTxData).at(1).simulate('click');
                const { label, name, channel } = greenContract;
                postToVSCodeStub.should.have.been.calledOnceWithExactly({
                    command: ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY,
                    data: {
                        label,
                        name,
                        channel,
                    }
                });
            });

            it('should show the transaction dropdown as disabled and have no items as no directory is associated', () => {
                const dropdown: any = component.find(transactionNameSelector);
                expect(dropdown.prop('disabled')).toBeTruthy();
                expect(dropdown.prop('items')).toEqual([]);
            });

            it('should not submit if no directory is associated as the submit button is disabled', () => {
                component.find('#submit-button').at(1).simulate('click');
                postToVSCodeStub.should.not.have.been.called;
            });

            it('should not submit if no directory is associated as the evaluate button is disabled', () => {
                component.find('#evaluate-button').at(1).simulate('click');
                postToVSCodeStub.should.not.have.been.called;
            });
        });

        describe('With associatedTxdata', () => {
            beforeEach(() => {
                component = mount(<TransactionInputContainer smartContract={greenContract} associatedTxdata={associatedTxdata} txdataTransactions={txdataTransactions} preselectedTransaction={preselectedTransaction} />);
                component = toggleContentSwitcher(component);
            });

            it('should show the FileUploaderItem and hide the Button', () => {
                expect(component.find(FileUploaderItem).exists()).toBeTruthy();
                expect(component.find(selectTxData).exists()).toBeFalsy();
            });

            it('should call the DISSOCIATE_TRANSACTION_DATA_DIRECTORY vscode command when the onDelete prop is called on the FileUploaderItem', () => {
                act(() => {
                    component.find(FileUploaderItem).prop('onDelete')();
                });
                const { label, name, channel } = greenContract;
                postToVSCodeStub.should.have.been.calledOnceWithExactly({
                    command: ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY,
                    data: {
                        label,
                        name,
                        channel,
                    }
                });
            });

            it('should show the transaction dropdown as enabled and display the txdataTransactions as a directory is associated', () => {
                const dropdown: any = component.find(transactionNameSelector);
                expect(dropdown.prop('disabled')).toBeFalsy();
                expect(dropdown.prop('items')).toEqual(txdataTransactions);
            });

            it('updates the dropdown when the transaction is chosen', () => {
                let dropdown: any = component.find(transactionNameSelector);

                const defaultTransaction: IDataFileTransaction = {
                    transactionName: 'Select the transaction name',
                    transactionLabel: '',
                    arguments: [],
                    transientData: {},
                    txDataFile: '',
                };
                expect(dropdown.prop('selectedItem')).toEqual(defaultTransaction);

                component = updateDataInputValues(component, txdataTransactions[0]);

                dropdown = component.find(transactionNameSelector);
                expect(dropdown.prop('selectedItem')).toEqual(txdataTransactions[0]);
            });

            it('should attempt to submit a transaction when the submit button is clicked ', () => {
                component = updateDataInputValues(component, txdataTransactions[0]);

                component.find('#submit-button').at(0).simulate('click');

                postToVSCodeStub.should.have.been.calledOnceWithExactly({
                    command: ExtensionCommands.SUBMIT_TRANSACTION,
                    data: {
                        args: ['arg1', 'arg2'],
                        channelName: 'mychannel',
                        evaluate: false,
                        namespace: 'GreenContract',
                        peerTargetNames: greenContract.peerNames,
                        smartContract: 'greenContract',
                        transactionName: 'transactionOne',
                        transientData: { key: 'value' },
                        txDataFile: 'transactionData.txdata',
                    }
                });
            });

            it('should attempt to evaluate a transaction when the submit button is clicked ', () => {
                component = updateDataInputValues(component, txdataTransactions[0]);

                component.find('#evaluate-button').at(1).simulate('click');

                postToVSCodeStub.should.have.been.calledOnceWithExactly({
                    command: ExtensionCommands.EVALUATE_TRANSACTION,
                    data: {
                        args: ['arg1', 'arg2'],
                        channelName: 'mychannel',
                        evaluate: true,
                        namespace: 'GreenContract',
                        peerTargetNames: greenContract.peerNames,
                        smartContract: 'greenContract',
                        transactionName: 'transactionOne',
                        transientData: { key: 'value' },
                        txDataFile: 'transactionData.txdata',
                    }
                });
            });

            it('should attempt to submit a transaction with custom peers when the submit button is clicked', () => {
                component = updateDataInputValues(component, txdataTransactions[0]);

                component = updateSharedInputValues(component, [{
                    id: 'peer1',
                    label: 'peer1'
                }]);

                component.find('#submit-button').at(1).simulate('click');
                postToVSCodeStub.should.have.been.calledOnceWithExactly({
                    command: ExtensionCommands.SUBMIT_TRANSACTION,
                    data: {
                        args: ['arg1', 'arg2'],
                        channelName: 'mychannel',
                        evaluate: false,
                        namespace: 'GreenContract',
                        peerTargetNames: ['peer1'],
                        smartContract: 'greenContract',
                        transactionName: 'transactionOne',
                        transientData: { key: 'value' },
                        txDataFile: 'transactionData.txdata',
                    }
                });
            });

            it('should attempt to submit a transaction with custom peers when the evaluate button is clicked', () => {
                component = updateDataInputValues(component, txdataTransactions[0]);

                component = updateSharedInputValues(component, [{
                    id: 'peer1',
                    label: 'peer1'
                }]);

                component.find('#evaluate-button').at(1).simulate('click');
                postToVSCodeStub.should.have.been.calledOnceWithExactly({
                    command: ExtensionCommands.EVALUATE_TRANSACTION,
                    data: {
                        args: ['arg1', 'arg2'],
                        channelName: 'mychannel',
                        evaluate: true,
                        namespace: 'GreenContract',
                        peerTargetNames: ['peer1'],
                        smartContract: 'greenContract',
                        transactionName: 'transactionOne',
                        transientData: { key: 'value' },
                        txDataFile: 'transactionData.txdata',
                    }
                });
            });

            it('should not submit if no transaction has been selected as the submit button is disabled', () => {
                component.find('#submit-button').at(1).simulate('click');
                postToVSCodeStub.should.not.have.been.called;
            });

            it('should not submit if no transaction has been selected as the evaluate button is disabled', () => {
                component.find('#evaluate-button').at(1).simulate('click');
                postToVSCodeStub.should.not.have.been.called;
            });
        });
    });
});
