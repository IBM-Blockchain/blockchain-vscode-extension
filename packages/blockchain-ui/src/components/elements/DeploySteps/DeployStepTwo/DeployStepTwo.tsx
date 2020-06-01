import React, { Component } from 'react';
import { TextInput, FileUploader, Accordion, AccordionItem, Link, FileUploaderItem, InlineNotification } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';

interface IProps {
    selectedPackage: IPackageRegistryEntry;
    onDefinitionNameChange: (name: string, nameInvalid: boolean) => void;
    onDefinitionVersionChange: (name: string, versionInvalid: boolean) => void;
    onCollectionChange: (file: File) => void;
    currentDefinitionName: string;
    currentDefinitionVersion: string;
    currentCollectionFile: File | undefined;
    definitionNames: string[];
}

interface DeployStepTwoState {
    definitionNameValue: string;
    definitionVersionValue: string;
    collectionFile: File | undefined;
}

class DeployStepTwo extends Component<IProps, DeployStepTwoState> {
    nameInvalid: boolean;
    versionInvalid: boolean;

    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            definitionNameValue: this.props.currentDefinitionName ? this.props.currentDefinitionName : this.props.selectedPackage.name,
            definitionVersionValue: this.props.currentDefinitionVersion ? this.props.currentDefinitionVersion : this.props.selectedPackage.version as string,
            collectionFile: this.props.currentCollectionFile ? this.props.currentCollectionFile : undefined
        };

        this.handleDefinitionNameChange = this.handleDefinitionNameChange.bind(this);
        this.handleDefinitionVersionChange = this.handleDefinitionVersionChange.bind(this);
        this.isNameInvalid = this.isNameInvalid.bind(this);
        this.isVersionInvalid = this.isVersionInvalid.bind(this);

        this.nameInvalid = this.isNameInvalid(this.state.definitionNameValue);
        this.versionInvalid = this.isVersionInvalid(this.state.definitionVersionValue);
        this.collectionChange = this.collectionChange.bind(this);

    }

    componentWillReceiveProps(props: any): void {
        if (props.currentDefinitionName !== this.state.definitionNameValue) {
            this.setState({definitionNameValue: props.currentDefinitionName});
        }
    }

    handleDefinitionNameChange(data: any): void {
        const name: string = data.target.value.trim();

        this.nameInvalid = this.isNameInvalid(name);

        this.props.onDefinitionNameChange(name, this.nameInvalid);
    }

    handleDefinitionVersionChange(data: any): void {
        const version: string = data.target.value.trim();

        this.versionInvalid = this.isVersionInvalid(version);

        this.props.onDefinitionVersionChange(version, this.versionInvalid);
    }

    isNameInvalid(name: string): boolean {
        const regex: RegExp = /^[a-zA-Z0-9-_]+$/;
        const validName: boolean = regex.test(name);
        if (name.length === 0 || !validName) {
            return true;
        } else {
            return false;
        }
    }

    isVersionInvalid(version: string): boolean {
        if (version.length === 0) {
            return true;
        } else {
            return false;
        }
    }

    collectionChange(event: any): void {
        const files: FileList = event.target.files;
        if (files.length > 0) {
            const file: File = files[0];
            this.props.onCollectionChange(file);
        }

    }

    render(): JSX.Element {
        const defaultCollectionValue: string[] = this.state.collectionFile ? [this.state.collectionFile.name] : [];

        let uploadedItem: JSX.Element = <></>;
        if (defaultCollectionValue.length > 0) {
            uploadedItem = (
                <FileUploaderItem name={defaultCollectionValue[0]} status='edit'></FileUploaderItem>
            );
        }

        let contractExists: JSX.Element | undefined;

        if (this.props.definitionNames.indexOf(this.state.definitionNameValue) > -1 ) {
            contractExists = (
                <div className='bx--row margin-bottom-05'>
                    <div className='bx--col-lg-10'>
                        <InlineNotification
                                hideCloseButton={true}
                                kind='info'
                                lowContrast={true}
                                notificationType='inline'
                                role='alert'
                                statusIconDescription='describes the status icon'
                                subtitle={<p>You should change the definition version to update the existing smart contract, or provide a new name to deploy as a new definition.</p>}
                                title='Name matches an existing smart contract'
                            />
                    </div>
                </div>

            );
        }

        return (
            <>
                <div className='bx--row margin-bottom-06'>
                    <div className='bx--col-lg-10'>
                        A smart contract definition describes how the selected package will be deployed in this channel.
                        The package's name and version (where available) are copied across to the definition as defaults.
                        You may optionally change them.
                    </div>
                </div>
                <div className={'bx--row' + (contractExists ? ' margin-bottom-03' : ' margin-bottom-06')}>
                    <div className='bx--col-lg-10'>
                        <h5>Smart contract definition</h5>
                    </div>
                    <div className='bx--col-lg-10'>
                        <div className='bx--row'>

                            <div className='bx--col-lg-7 bx--col-md-3 bx--col-sm-4'>
                                <TextInput invalidText={`Name can only contain alphanumeric, '_' and '-' characters.`} invalid={this.nameInvalid} id='nameInput' labelText='Definition name' defaultValue={this.state.definitionNameValue} onChange={this.handleDefinitionNameChange}></TextInput>
                            </div>
                            <div className='bx--col-lg-2 bx--col-md-1 bx--col-sm-0'></div>
                            <div className='bx--col-lg-7 bx--col-md-3 bx--col-sm-4'>
                                <TextInput invalidText={'Version cannot be empty'} invalid={this.versionInvalid} id='versionInput' labelText='Definition version' defaultValue={this.state.definitionVersionValue} onChange={this.handleDefinitionVersionChange}></TextInput>
                            </div>
                        </div>
                    </div>
                </div>

                {contractExists}

                <div className='bx--row margin-bottom-06'>
                    <div className='bx--col-lg-10'>

                        <div className='bx--row'>
                            <div className='bx--col-lg-7 bx--col-md-3 bx--col-sm-4'>
                                <div className='bx--file__container'>
                                    <FileUploader
                                        accept={[
                                        '.json'
                                        ]}
                                        buttonKind='tertiary'
                                        buttonLabel='Add file'
                                        labelDescription='Default (1 endorser, any org) will be used unless you add your own.'
                                        labelTitle='Endorsement policy'
                                        size='default'
                                    />
                                </div>
                            </div>
                            <div className='bx--col-lg-2 bx--col-md-1 bx--col-sm-0'></div>
                            <div className='bx--col-lg-7 bx--col-md-3 bx--col-sm-4'>
                                <div className='bx--file__container'>
                                    <FileUploader
                                        defaultValue={defaultCollectionValue}
                                        accept={[
                                        '.json'
                                        ]}
                                        buttonKind='tertiary'
                                        buttonLabel='Add file'
                                        labelDescription='Default (implicit private data collections only) will be used unless you add your own.'
                                        labelTitle='Collections configuration'
                                        size='default'
                                        filenameStatus='edit'
                                        onChange={this.collectionChange}
                                    />
                                    {uploadedItem}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='bx--row'>
                    <div className='bx--col-lg-10'>
                        <Accordion>
                            <AccordionItem title={'Learn about other smart contract definition parameters (advanced)'}>
                                <p className='margin-bottom-05'>These developer tools automatically handle some parameters for simplied development.
                                    For a full explainabtion of definition parameters and Fabric v2.X smart contract lifecycle, see the <Link href='#'>Fabric documentation</Link>.
                                </p>
                                <p className='margin-bottom-05'>
                                    To deploy with full control of all parameters, please use the <Link href='#'>IBM Blockchain Platform Console</Link> or <Link href='#'>Hyperledger Fabric CLIs</Link>.
                                </p>
                                <p className='margin-bottom-05'>
                                    Read about how our simplified deployment handles the other parameters in the <Link href='#'>IBM Blockchain Platform documentation</Link>.
                                </p>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepTwo;
