interface IOutputObject {
    transactionName: string;
    action: string;
    startTime: string;
    result: string;
    endTime: string;
    args: string[];
    transientData?: string;
    output: string;
}

export default IOutputObject;
