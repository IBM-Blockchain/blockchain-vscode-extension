import ISampleObject from './ISampleObject';

interface IRepositoryObject {
    name: string;
    orgName: string;
    remote: string;
    samples: ISampleObject[];
    tutorials?: any[];
}

export default IRepositoryObject;
