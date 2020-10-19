export interface IDataFileTransaction {
    transactionName: string;
    transactionLabel: string;
    txDataFile: string;
    arguments: Array<string>;
    transientData: object;
}

export default IDataFileTransaction;
