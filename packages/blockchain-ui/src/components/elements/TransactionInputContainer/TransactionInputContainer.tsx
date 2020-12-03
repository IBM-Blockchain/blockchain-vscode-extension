import React, { FunctionComponent, useState, useEffect } from 'react';
import { ContentSwitcher, Form, Switch, MultiSelect } from 'carbon-components-react';
import TransactionManualInput from '../TransactionManualInput/TransactionManualInput';
import TransactionDataInput from '../TransactionDataInput/TransactionDataInput';
import TransactionSubmitButtons from '../TransactionSubmitButtons/TransactionSubmitButtons';
import ISmartContract from '../../../interfaces/ISmartContract';
import IDataFileTransaction from '../../../interfaces/IDataFileTransaction';
import ITransactionManualInput from '../../../interfaces/ITransactionManualInput';
import { ExtensionCommands } from '../../../ExtensionCommands';
import Utils from '../../../Utils';
import IAssociatedTxdata from '../../../interfaces/IAssociatedTxdata';
import ITransaction from '../../../interfaces/ITransaction';
import './TransactionInputContainer.scss';

interface IProps {
    smartContract: ISmartContract;
    associatedTxdata: IAssociatedTxdata | undefined;
    txdataTransactions: IDataFileTransaction[];
    preselectedTransaction: ITransaction;
}

const emptyTransaction: ITransaction = { name: '', parameters: [], returns: { type: '' }, tag: [] };

const activeTransactionExists: any = (smartContract: ISmartContract, currentlyActiveTransaction: ITransaction) => {
    const index: number = smartContract.transactions.findIndex((transaction) => (
        JSON.stringify(transaction) === JSON.stringify(currentlyActiveTransaction)
    ));
    return index > -1;
};

const TransactionInputContainer: FunctionComponent<IProps> = ({ smartContract, associatedTxdata, txdataTransactions, preselectedTransaction }) => {
    const { peerNames } = smartContract;

    const [isManual, setIsManual] = useState(true);
    const [peerTargetNames, setPeerTargetNames] = useState(peerNames);

    const [manualInputState, updateManualInputState] = useState<ITransactionManualInput>({
        activeTransaction: preselectedTransaction || emptyTransaction,
        transactionArguments: [],
        transientData: '',
    });

    // The data input transaction only needs the transaction.
    // When more is needed, convert it to an object like above
    const [dataInputTransaction, updateDataInputTransaction] = useState<IDataFileTransaction>({ transactionName: '', transactionLabel: '', txDataFile: '', arguments: [], transientData: {} });

    useEffect(() => {
        const { activeTransaction } = manualInputState;
        if (activeTransaction && activeTransaction.name !== '' && !activeTransactionExists(smartContract, activeTransaction)) {
            // if the smartContract is changed/updated, only persist the activeTransaction if it still exists
            updateManualInputState({ ...manualInputState, activeTransaction: emptyTransaction, transactionArguments: [] });
        } else if (preselectedTransaction && preselectedTransaction.name && activeTransaction !== preselectedTransaction) {
            // If the preselectedTransaction is changed, update the activeTransaction. Ignore if the preselectedTransaction is empty
            updateManualInputState({ ...manualInputState, activeTransaction: preselectedTransaction, transactionArguments: [] });
        }
    }, [smartContract, manualInputState, preselectedTransaction]);

    const submitTransaction: any = (evaluate: boolean): void => {

        const command: string = evaluate ? ExtensionCommands.EVALUATE_TRANSACTION : ExtensionCommands.SUBMIT_TRANSACTION;
        const { name: smartContractName, channel: channelName, namespace } = smartContract;

        const data: any = {
            evaluate,
            peerTargetNames,
            smartContract: smartContractName,
            channelName,
            namespace,
            transactionName: isManual ? manualInputState.activeTransaction.name : dataInputTransaction.transactionName,
            args: isManual ? manualInputState.transactionArguments : dataInputTransaction.arguments,
            transientData: isManual ? manualInputState.transientData : dataInputTransaction.transientData,
            txDataFile: isManual ? undefined : dataInputTransaction.txDataFile,
        };

        Utils.postToVSCode({ command, data });
    };

    const updateCustomPeers: any = (event: { selectedItems: { id: string; label: string}[] } ): void => {
        const peers: string[] = event.selectedItems.map((peerObject: {id: string, label: string }) => {
            return peerObject.id;
        });
        setPeerTargetNames(peers);
    };

    const formatPeersForMultiSelect: any = (peers: string[]): { id: string, label: string }[] => {
        return peers.map((peer) => ({ id: peer, label: peer }));
    };

    const shouldDisableManual: boolean = !(manualInputState && manualInputState.activeTransaction && manualInputState.activeTransaction.name !== '');
    const shouldDisableDataFile: boolean = dataInputTransaction.transactionName === '';
    const shouldDisableButtons: boolean = (isManual ? shouldDisableManual : shouldDisableDataFile) || peerTargetNames.length === 0;

    // tslint:disable-next-line: no-console
    const ignoreEvent: any = (e: any) => console.log('event ignored', e);
    return (
        <>
            <ContentSwitcher className='transaction-input-content-switch' selectionMode='manual' onChange={() => setIsManual(!isManual)}>
                {/* Typescript requires the onClick and onKeyDown functions but we don't need them */}
                <Switch name='one' text='Manual input' data-testid='content-switch-manual' onClick={ignoreEvent} onKeyDown={ignoreEvent} />
                <Switch name='two' text='Transaction data directory' data-testid='content-switch-data' onClick={ignoreEvent} onKeyDown={ignoreEvent}/>
            </ContentSwitcher>
            <Form id='create-txn-form'>
                {isManual
                    ? (
                        <TransactionManualInput
                            smartContract={smartContract}
                            manualInputState={manualInputState}
                            setManualInput={updateManualInputState}
                        />
                    ) : (
                        <TransactionDataInput
                            smartContract={smartContract}
                            associatedTxdata={associatedTxdata}
                            txdataTransactions={txdataTransactions}
                            selectedTransaction={dataInputTransaction}
                            updateTransaction={updateDataInputTransaction}
                        />
                    )
                }
                <MultiSelect
                    id='peer-select'
                    initialSelectedItems={formatPeersForMultiSelect(peerTargetNames)}
                    items={formatPeersForMultiSelect(smartContract.peerNames)}
                    label='Select peers'
                    onChange={updateCustomPeers}
                    titleText={'Target specific peer (optional)'}
                />
                <TransactionSubmitButtons
                    shouldDisableButtons={shouldDisableButtons}
                    submitTransaction={submitTransaction}
                />
            </Form>
        </>
    );
};

export default TransactionInputContainer;
