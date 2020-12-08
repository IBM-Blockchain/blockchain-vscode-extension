import React, { Dispatch, FunctionComponent, SetStateAction } from 'react';
import './TransactionManualInput.scss';
import { Dropdown, TextArea, TextInput } from 'carbon-components-react';
import ITransaction from '../../../interfaces/ITransaction';
import ISmartContract from '../../../interfaces/ISmartContract';
import ITransactionManualInput from '../../../interfaces/ITransactionManualInput';

interface IProps {
    smartContract: ISmartContract;
    manualInputState: ITransactionManualInput;
    setManualInput: Dispatch<SetStateAction<ITransactionManualInput>>;
    setActiveTransaction: Dispatch<SetStateAction<ITransaction>>;
    transactionArgumentsAreValid: boolean;
}

const TransactionManualInput: FunctionComponent<IProps> = ({ smartContract, manualInputState, setManualInput, setActiveTransaction, transactionArgumentsAreValid }: IProps) => {
    const { activeTransaction, transactionArguments, transientData } = manualInputState;
    const hasMetadata: boolean = smartContract.namespace !== undefined;

    function setActiveTransactionWrapper(data: any): void {
        const { transactions } = smartContract;
        const transaction: ITransaction | undefined = transactions.find((txn: ITransaction) => txn.name === data.selectedItem);
        if (transaction) {
            setActiveTransaction(transaction);
        }
    }

    function updateTransactionArguments(event: React.FormEvent<HTMLTextAreaElement>): void {
        const newArgs: string = event.currentTarget.value;

        setManualInput({
            ...manualInputState,
            transactionArguments: newArgs,
        });
    }

    const transactionHasBeenChosen: boolean = activeTransaction && activeTransaction.name !== '';

    return (
        <>
            {hasMetadata
                ? (
                    <Dropdown
                        ariaLabel='dropdown'
                        id='transaction-select'
                        invalidText='A valid value is required'
                        items={smartContract.transactions.map(({ name }) => name)}
                        label='Select the transaction name'
                        titleText='Transaction name'
                        type='default'
                        selectedItem={transactionHasBeenChosen ? activeTransaction.name : 'Select the transaction name'}
                        onChange={setActiveTransactionWrapper}
                    />
                ) : (
                    <TextInput
                        id='transaction-name'
                        labelText='Transaction name'
                        onChange={(e) => setManualInput({ ...manualInputState, activeTransaction: {...activeTransaction, name: e.currentTarget.value}})}
                    >
                    </TextInput>
                )
            }
            <TextArea
                labelText='Transaction arguments'
                id='arguments-text-area'
                onChange={updateTransactionArguments}
                value={transactionArguments}
                disabled={!transactionHasBeenChosen}
                invalidText='The transaction arguments should be valid JSON'
                invalid={transactionHasBeenChosen && !transactionArgumentsAreValid}
            />
            <TextArea
                id='transient-data-input'
                labelText='Transient data (optional)'
                hideLabel={false}
                onChange={(e) => setManualInput({ ...manualInputState, transientData: e.currentTarget.value })}
                value={transientData}
            />
        </>
    );
};

export default TransactionManualInput;
