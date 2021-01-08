import ITransaction from './ITransaction';

interface ISmartContract {
    name: string;
    version: string;
    channel: string;
    label: string;
    transactions: Array<ITransaction>;
    peerNames: string[];
    namespace: string | undefined;
    contractName: string | undefined;
}

export default ISmartContract;
