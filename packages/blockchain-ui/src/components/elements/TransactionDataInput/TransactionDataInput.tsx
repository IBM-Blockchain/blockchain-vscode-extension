import React, { Dispatch, FunctionComponent, SetStateAction } from 'react';
import path from 'path';
import './TransactionDataInput.scss';
import { Button, Dropdown, FileUploaderItem } from 'carbon-components-react';
import ISmartContract from '../../../interfaces/ISmartContract';
import { ExtensionCommands } from '../../../ExtensionCommands';
import Utils from '../../../Utils';
import IAssociatedTxdata from '../../../interfaces/IAssociatedTxdata';
import IDataFileTransaction from '../../../interfaces/IDataFileTransaction';

interface IProps {
    smartContract: ISmartContract | undefined;
    associatedTxdata: IAssociatedTxdata;
    selectedTransaction: IDataFileTransaction;
    updateTransaction: Dispatch<SetStateAction<IDataFileTransaction>>;
}

const displayTransactionInDropdown: any = ({ transactionName, transactionLabel, txDataFile }: IDataFileTransaction): string => {
    const filename: string = txDataFile !== '' ? `(${path.basename(txDataFile)})` : '';
    // Use transaction label if it exists
    if (transactionLabel) {
        return `${transactionLabel} ${filename}`;
    }
    return `${transactionName} ${filename}`;
};

const TransactionDataInput: FunctionComponent<IProps> = ({ smartContract, associatedTxdata, selectedTransaction, updateTransaction }) => {

    const addOrRemoveTransactionDirectory: any = (associate: boolean): void => {
        // The inputs should be disabled so the smartContract should not be undefined
        const { label, name, channel } = smartContract as ISmartContract;
        const command: string = associate ? ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY : ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY;
        const data: { label: string, name: string, channel: string } = { label, name, channel };
        Utils.postToVSCode({ command, data });

        if (!associate) {
            updateTransaction({ transactionName: '', transactionLabel: '', txDataFile: '', arguments: [], transientData: {} });
        }
    };

    const displayChooseOption: IDataFileTransaction = { transactionName: 'Select the transaction name', transactionLabel: '', txDataFile: '', arguments: [], transientData: {} };
    const activeAssociatedTxData: { channelName: string, transactionDataPath: string, transactions: IDataFileTransaction[] } | undefined = smartContract && associatedTxdata && associatedTxdata[smartContract.name];
    return (
        <>
            <div className='associate-tx-data'>
                <h6>Select transaction directory</h6>
                <p>Not sure how to get started? Find out more information <a href='https://github.com/IBM-Blockchain/blockchain-vscode-extension/wiki/Common-tasks-and-how-to-complete-them#using-transaction-data-files-to-submit-a-transaction'>here</a></p>
                {smartContract && activeAssociatedTxData
                    ? (
                        <FileUploaderItem
                            name={activeAssociatedTxData.transactionDataPath}
                            status='edit'
                            onDelete={() => addOrRemoveTransactionDirectory(false)}
                        />
                    ) : (
                        <Button
                            size='default'
                            data-testid='select-tx-data-dir'
                            onClick={() => addOrRemoveTransactionDirectory(true)}
                            disabled={!smartContract}
                        >
                            Add directory
                        </Button>
                    )
                }
            </div>
            <Dropdown
                ariaLabel='dropdown'
                id='transaction-data-select'
                invalidText='A valid value is required'
                items={activeAssociatedTxData ? activeAssociatedTxData.transactions : []}
                itemToString={displayTransactionInDropdown}
                label='Select the transaction name'
                titleText='Transaction label'
                type='default'
                selectedItem={associatedTxdata && selectedTransaction.transactionName ? selectedTransaction : displayChooseOption}
                onChange={({ selectedItem }) => updateTransaction(selectedItem as IDataFileTransaction)}
                disabled={!activeAssociatedTxData || !activeAssociatedTxData.transactions || !smartContract}
            />
        </>
    );
};

export default TransactionDataInput;
