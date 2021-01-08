import IDataFileTransaction from './IDataFileTransaction';

interface IAssociatedTxData {
    [chaincodeName: string]: {
        channelName: string,
        transactionDataPath: string,
        transactions: IDataFileTransaction[]
    };
}

export default IAssociatedTxData;
