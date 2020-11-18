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
    smartContract: ISmartContract;
    associatedTxdata: IAssociatedTxdata | undefined;
    txdataTransactions: IDataFileTransaction[];
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

const TransactionDataInput: FunctionComponent<IProps> = ({ smartContract, associatedTxdata, txdataTransactions, selectedTransaction, updateTransaction }) => {

    const addOrRemoveTransactionDirectory: any = (associate: boolean): void => {
        const { label, name, channel } = smartContract;
        const command: string = associate ? ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY : ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY;
        const data: { label: string, name: string, channel: string } = { label, name, channel };
        Utils.postToVSCode({ command, data });

        if (!associate) {
            updateTransaction({ transactionName: '', transactionLabel: '', txDataFile: '', arguments: [], transientData: {} });
        }
    };

    const updateSelectedTransaction: any = ({ selectedItem }: { selectedItem: IDataFileTransaction }): void => {
        updateTransaction(selectedItem);
    };

    const displayChooseOption: IDataFileTransaction = { transactionName: 'Select the transaction name', transactionLabel: '', txDataFile: '', arguments: [], transientData: {} };
    return (
        <>
            <div className='associate-tx-data'>
                <h6>Select transaction directory</h6>
                <p>Not sure how to get started? Find out more information <a href='https://github.com/IBM-Blockchain/blockchain-vscode-extension#using-transaction-data-files-to-submit-a-transaction'>here</a></p>
                {associatedTxdata
                    ? (
                        <FileUploaderItem
                            name={associatedTxdata.transactionDataPath}
                            status='edit'
                            onDelete={() => addOrRemoveTransactionDirectory(false)}
                        />
                    ) : (
                        <Button
                            size='default'
                            data-testid='select-tx-data-dir'
                            onClick={() => addOrRemoveTransactionDirectory(true)}
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
                items={associatedTxdata ? txdataTransactions : []}
                itemToString={displayTransactionInDropdown}
                label='Select the transaction name'
                titleText='Transaction label'
                type='default'
                selectedItem={associatedTxdata && selectedTransaction.transactionName ? selectedTransaction : displayChooseOption}
                onChange={updateSelectedTransaction}
                disabled={!associatedTxdata}
            />
        </>
    );
};

export default TransactionDataInput;
