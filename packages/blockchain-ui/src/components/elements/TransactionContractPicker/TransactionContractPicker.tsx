import React, { FunctionComponent } from 'react';
import { Dropdown } from 'carbon-components-react';
import ISmartContract from '../../../interfaces/ISmartContract';
import './TransactionContractPicker.scss';

interface IProps {
    smartContracts: ISmartContract[];
    activeContract: ISmartContract | undefined;
    onChange: any;
}

const TransactionContractPicker: FunctionComponent<IProps> = ({ smartContracts, activeContract, onChange }: IProps) => {
    return (
        <Dropdown
            ariaLabel='dropdown'
            id='contract-select'
            invalidText='A valid value is required'
            items={smartContracts.map(({ contractName }) => contractName)}
            label='Select the contract'
            titleText='Contract selection'
            type='default'
            selectedItem={activeContract ? activeContract.contractName : 'Select the contract'}
            onChange={onChange}
        />
    );
};

export default TransactionContractPicker;
