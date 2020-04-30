import React, { Component } from 'react';
import { Dropdown, Accordion, AccordionItem } from 'carbon-components-react';
import IPackageRegistryEntry from '../../../../interfaces/IPackageRegistryEntry';

interface IProps {
    packageEntries: IPackageRegistryEntry[];
    selectedPackage: IPackageRegistryEntry | undefined; // Package the user has selected in dropdown
    onPackageChange: (selectedPackage: IPackageRegistryEntry) => void; // Callback to DeployPage
}

interface StepOneState {
    packageEntries: IPackageRegistryEntry[];
}

class DeployStepOne extends Component<IProps, StepOneState> {

    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            packageEntries: this.props.packageEntries
        };

        this.formatPackageEntries = this.formatPackageEntries.bind(this);
        this.selectPackage = this.selectPackage.bind(this);

    }

    selectPackage(data: any): void {
        const _selectedParts: string[] = data.selectedItem.split('@');
        const packageName: string = _selectedParts[0];
        const packageVersion: string = _selectedParts[1].split(' (packaged)')[0];

        const selectedPackage: IPackageRegistryEntry | undefined = this.state.packageEntries.find((_entry: IPackageRegistryEntry) => {
            return _entry.name === packageName && _entry.version === packageVersion;
        }) as IPackageRegistryEntry;

        this.props.onPackageChange(selectedPackage);
    }

    formatPackageEntries(): string[] {
        const packageNames: string[] = [];
        for (const entry of this.state.packageEntries) {
            const entryName: string = `${entry.name}@${entry.version} (packaged)`;
            packageNames.push(entryName);
        }

        return packageNames;
    }

    render(): JSX.Element {
        const items: string[] = this.formatPackageEntries();

        return (
            <>
                <div className='bx--row dropdown-row'>
                    <div className='bx--col'>
                        <div style={{width: 384}}>
                            <Dropdown
                                ariaLabel='dropdown'
                                id='package-select'
                                invalidText='A valid value is required'
                                items={items}
                                label='Choose an option'
                                titleText='Choose a smart contract to deploy'
                                type='default'
                                selectedItem={this.props.selectedPackage ? `${this.props.selectedPackage.name}@${this.props.selectedPackage.version} (packaged)` : undefined }
                                onChange={this.selectPackage}
                            />
                        </div>
                    </div>
                </div>
                <div className='bx--row'>
                    <div className='bx--col-lg-10 '>
                        <Accordion>
                            <AccordionItem title={'How does Fabric v2.X smart contract deployment work?'}>
                                <p>TODO</p>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </>
        );
    }
}

export default DeployStepOne;
