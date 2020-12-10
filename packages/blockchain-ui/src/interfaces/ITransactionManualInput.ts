import ITransaction from './ITransaction';

interface ITransactionManualInput {
    activeTransaction: ITransaction;
    transactionArguments: string;
    transientData: string;
}

export default ITransactionManualInput;
