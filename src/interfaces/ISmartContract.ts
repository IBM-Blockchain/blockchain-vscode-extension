import ITransaction from './ITransaction';

interface ISmartContract {
    name: string;
    version: string;
    channel: string;
    label: string;
    transactions: Array<ITransaction>;
    namespace: string;
}

export default ISmartContract;
