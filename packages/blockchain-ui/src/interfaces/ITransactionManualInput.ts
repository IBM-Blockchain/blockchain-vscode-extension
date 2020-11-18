import ITransaction from './ITransaction';

interface ITransactionManualInput {
    activeTransaction: ITransaction;
    transactionArguments: Array<string>;
    transientData: string;
}

export default ITransactionManualInput;
