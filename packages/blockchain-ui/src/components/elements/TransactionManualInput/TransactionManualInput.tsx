import React, { Dispatch, FunctionComponent, SetStateAction, useEffect, useState } from 'react';
import './TransactionManualInput.scss';
import { Dropdown, TextArea, TextInput } from 'carbon-components-react';
import ITransaction from '../../../interfaces/ITransaction';
import ISmartContract from '../../../interfaces/ISmartContract';
import ITransactionManualInput from '../../../interfaces/ITransactionManualInput';

interface IProps {
    smartContract: ISmartContract;
    manualInputState: ITransactionManualInput;
    setManualInput: Dispatch<SetStateAction<ITransactionManualInput>>;
}

function convertArgsToJSON(parameters: Array<{ description: string, name: string, schema: {} }>, values?: Array<string>): string {
    const args: { [key: string]: any } = {};

    if (parameters && parameters.length > 0) {
        parameters.forEach(({ name }, i) => {
            args[name] = (values && values[i]) ? values[i] : '';
        });
        return JSON.stringify(args, null, 2);
    }

    return '';
}

function convertJSONToArgs(transactionArguments: string): Array<string> {
    if (!transactionArguments) {
        return [];
    }
    const args: { [key: string]: any } = JSON.parse(transactionArguments);
    const array: Array<any> = Object.keys(args).map((key: string) => `${args[key]}`);
    return array;
}

const getInitialUnparsedArgsFromTransaction: any = (transaction: ITransaction, transactionArguments: Array<string>): string => {
    if (transaction && transaction.name !== '' && transaction.parameters && transaction.parameters.length > 0) {
        return convertArgsToJSON(transaction.parameters, transactionArguments);
    }
    return '';
};

const TransactionManualInput: FunctionComponent<IProps> = ({ smartContract, manualInputState, setManualInput }) => {
    const { activeTransaction, transactionArguments, transientData } = manualInputState;
    const hasMetadata: boolean = smartContract.namespace !== undefined;

    const [unparsedArgs, setUnparsedArgs] = useState(getInitialUnparsedArgsFromTransaction(activeTransaction, transactionArguments));

    useEffect(() => {
        const newUnparsedArgs: string = getInitialUnparsedArgsFromTransaction(activeTransaction, transactionArguments);
        if (newUnparsedArgs !== unparsedArgs) {
            setUnparsedArgs(newUnparsedArgs);
        }
    }, [activeTransaction, transactionArguments, unparsedArgs]);

    function setActiveTransaction(data: any): void {
        const { transactions } = smartContract;
        const transaction: ITransaction | undefined = transactions.find((txn: ITransaction) => txn.name === data.selectedItem);
        if (transaction) {
            const args: string = convertArgsToJSON(transaction.parameters);

            setUnparsedArgs(args);
            setManualInput({
                ...manualInputState,
                activeTransaction: transaction,
                transactionArguments: convertJSONToArgs(args),
            });
        }
    }

    function updateTransactionArguments(event: React.FormEvent<HTMLTextAreaElement>): void {
        const newArgs: string = event.currentTarget.value;
        setUnparsedArgs(newArgs);
        // TODO handle invalid JSON
        setManualInput({
            ...manualInputState,
            transactionArguments: convertJSONToArgs(newArgs),
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
                        onChange={setActiveTransaction}
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
                value={unparsedArgs}
                disabled={!transactionHasBeenChosen}
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
