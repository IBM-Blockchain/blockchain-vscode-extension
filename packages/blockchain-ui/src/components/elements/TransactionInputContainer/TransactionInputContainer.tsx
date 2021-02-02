import React, { FunctionComponent, useState, useEffect, useCallback } from 'react';
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
    smartContract: ISmartContract | undefined;
    associatedTxdata: IAssociatedTxdata;
    preselectedTransaction: ITransaction;
    setTransactionSubmitted: () => void;
}

const emptyTransaction: ITransaction = { name: '', parameters: [], returns: { type: '' }, tag: [] };

const activeTransactionExists: any = (smartContract: ISmartContract, currentlyActiveTransaction: ITransaction) => {
    const index: number = smartContract.transactions.findIndex((transaction) => (
        JSON.stringify(transaction) === JSON.stringify(currentlyActiveTransaction)
    ));
    return index > -1;
};

const areTransactionArgsValid: (t: string) => boolean = (transactionArguments: string) => {
    if (transactionArguments === '') {
        return true;
    }
    try {
        JSON.parse(transactionArguments);
        return true;
    } catch {
        return false;
    }
};

const convertJSONToArgs: (t: string, tr: ITransaction) => Array<string> = (transactionArguments: string, transaction: ITransaction) => {
    if (!transactionArguments) {
        return [];
    }
    const args: { [key: string]: any } = JSON.parse(transactionArguments);
    let argKeys: string[] = Object.keys(args);
    if (transaction !== emptyTransaction && transaction.parameters && transaction.parameters.length > 0) {
        // Typos in the arg names will lead to missing parameters, which is confusing
        // from a user perspective. Only use default order if there are no typos.
        const argNames: string[] = transaction.parameters.map((entry: any) => entry.name).filter((name: string) => argKeys.includes(name));
        if (argKeys.length === argNames.length) {
            argKeys = argNames;
        }
    }
    const array: Array<any> = argKeys.map((key: string) => typeof args[key] === 'object' && args[key] !== null ? JSON.stringify(args[key]) : `${args[key]}`);
    return array;
};

const getArgsFromTransactionAndConvertToJSON: any = (transaction: ITransaction, transactionArguments: string): string => {
    if (transaction && transaction.name !== '' && transaction.parameters && transaction.parameters.length > 0) {
        const args: { [key: string]: any } = {};
        let parsedTransactionArguments: { [key: string]: any };
        try {
            parsedTransactionArguments = JSON.parse(transactionArguments);
        } catch {
            parsedTransactionArguments = {};
        }
        transaction.parameters.forEach(({ name }) => {
            args[name] = (parsedTransactionArguments && parsedTransactionArguments[name]) ? parsedTransactionArguments[name] : '';
        });
        return JSON.stringify(args, null, 2);
    }
    return '[]';
};

const TransactionInputContainer: FunctionComponent<IProps> = ({ smartContract, associatedTxdata, preselectedTransaction, setTransactionSubmitted }) => {
    const [smartContractName, setNewSmartContractName] = useState(smartContract ? smartContract.name : '');
    const [currentPreselectedTransaction, setCurrentPreselectedTransaction] = useState(preselectedTransaction);

    const [isManual, setIsManual] = useState(true);
    const [peerTargetNames, setPeerTargetNames] = useState(smartContract ? smartContract.peerNames : []);

    const [manualInputState, updateManualInputState] = useState<ITransactionManualInput>({
        activeTransaction: preselectedTransaction || emptyTransaction,
        transactionArguments: '[]',
        transientData: '',
    });

    // The data input transaction only needs the transaction.
    // When more is needed, convert it to an object like above
    const [dataInputTransaction, updateDataInputTransaction] = useState<IDataFileTransaction>({ transactionName: '', transactionLabel: '', txDataFile: '', arguments: [], transientData: {} });

    const setManualActiveTransaction: any = useCallback((activeTransaction: ITransaction) => {
        if (activeTransaction !== manualInputState.activeTransaction) {
            let args: string = '[]';
            if (activeTransaction !== emptyTransaction) {
                args = getArgsFromTransactionAndConvertToJSON(activeTransaction, manualInputState.transactionArguments);
            }
            updateManualInputState({ ...manualInputState, activeTransaction, transactionArguments: args });
        }
    }, [manualInputState]);

    useEffect(() => {
        const { activeTransaction } = manualInputState;
        if (smartContract && smartContract.namespace !== undefined && activeTransaction && activeTransaction.name !== '' && !activeTransactionExists(smartContract, activeTransaction)) {
            // if the smartContract is changed/updated, only persist the activeTransaction if it still exists
            setManualActiveTransaction(emptyTransaction);
        }
    }, [smartContract, manualInputState, setManualActiveTransaction]);

    useEffect(() => {
        const smartContractChanged: boolean = !smartContract || smartContract.name !== smartContractName;
        if (smartContractChanged) {
            setNewSmartContractName(smartContract ? smartContract.name : '');

            // If smart contract is changed, clear the data input transaction no matter if it exists or not
            updateDataInputTransaction({ transactionName: '', transactionLabel: '', txDataFile: '', arguments: [], transientData: {} });
        }
    }, [smartContract, smartContractName, updateDataInputTransaction]);

    useEffect(() => {
        // If the preselectedTransaction is changed, update the activeTransaction
        const preselectedTransactionHasChanged: boolean = preselectedTransaction !== currentPreselectedTransaction;
        if (preselectedTransactionHasChanged) {
            if (preselectedTransaction && preselectedTransaction.name) {
                setManualActiveTransaction(preselectedTransaction);
            } else {
                setManualActiveTransaction(emptyTransaction);
            }
            setCurrentPreselectedTransaction(preselectedTransaction);
        }
    }, [preselectedTransaction, currentPreselectedTransaction, setManualActiveTransaction]);

    const submitTransaction: any = (evaluate: boolean, activeTransaction: ITransaction): void => {
        const command: string = evaluate ? ExtensionCommands.EVALUATE_TRANSACTION : ExtensionCommands.SUBMIT_TRANSACTION;

        const args: Array<string> = isManual ? convertJSONToArgs(manualInputState.transactionArguments, activeTransaction) : dataInputTransaction.arguments;

        const data: any = {
            evaluate,
            peerTargetNames,
            smartContract: smartContractName,
            channelName: smartContract && smartContract.channel,
            namespace: smartContract && smartContract.namespace,
            transactionName: isManual ? manualInputState.activeTransaction.name : dataInputTransaction.transactionName,
            args,
            transientData: isManual ? manualInputState.transientData : dataInputTransaction.transientData,
            txDataFile: isManual ? undefined : dataInputTransaction.txDataFile,
        };

        Utils.postToVSCode({ command, data });
        setTransactionSubmitted();
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

    const transactionArgumentsAreValid: boolean = areTransactionArgsValid(manualInputState.transactionArguments);

    const shouldDisableManual: boolean = !manualInputState.activeTransaction.name || !transactionArgumentsAreValid;
    const shouldDisableDataFile: boolean = dataInputTransaction.transactionName === '';
    const shouldDisableButtons: boolean = (isManual && shouldDisableManual) || (!isManual && shouldDisableDataFile) || (peerTargetNames && peerTargetNames.length === 0);
    const transaction: ITransaction = manualInputState.activeTransaction;

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
                            setActiveTransaction={setManualActiveTransaction}
                            transactionArgumentsAreValid={transactionArgumentsAreValid}
                        />
                    ) : (
                        <TransactionDataInput
                            smartContract={smartContract}
                            associatedTxdata={associatedTxdata}
                            selectedTransaction={dataInputTransaction}
                            updateTransaction={updateDataInputTransaction}
                        />
                    )
                }
                <MultiSelect
                    id='peer-select'
                    initialSelectedItems={formatPeersForMultiSelect(peerTargetNames)}
                    items={smartContract && formatPeersForMultiSelect(smartContract.peerNames)}
                    label='Select peers'
                    onChange={updateCustomPeers}
                    titleText={'Target specific peer (optional)'}
                    disabled={!smartContract}
                />
                <TransactionSubmitButtons
                    transaction={transaction}
                    shouldDisableButtons={shouldDisableButtons}
                    submitTransaction={submitTransaction}
                />
            </Form>
        </>
    );
};

export default TransactionInputContainer;
