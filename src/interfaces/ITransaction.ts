interface ITransaction {
    name: string;
    parameters: Array<{ description: string, name: string, schema: {} }>;
    returns: { type: string };
    tag: Array<string>;
}

export default ITransaction;
