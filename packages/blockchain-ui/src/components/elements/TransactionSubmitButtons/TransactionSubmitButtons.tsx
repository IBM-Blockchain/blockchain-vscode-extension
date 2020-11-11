import React, { FunctionComponent } from 'react';
import './TransactionSubmitButtons.scss';
import { Button, FormGroup } from 'carbon-components-react';

interface IProps {
    submitTransaction: (evaluate: boolean) => void;
    shouldDisableButtons: boolean;
}

const TransactionInputContainer: FunctionComponent<IProps> = ({ submitTransaction, shouldDisableButtons }) => {
    return (
        <FormGroup legendText='' id='submit-and-evaluate-buttons'>
            <div className='submit-txn-button-container'>
                <Button
                    size='default'
                    kind='secondary'
                    className='submit-txn-button'
                    id='evaluate-button'
                    disabled={shouldDisableButtons}
                    onClick={() => submitTransaction(true)}
                >
                        Evaluate transaction
                </Button>
                <Button
                    size='default'
                    kind='primary'
                    className='submit-txn-button'
                    id='submit-button'
                    disabled={shouldDisableButtons}
                    onClick={() => submitTransaction(false)}
                >
                        Submit transaction
                </Button>
            </div>
        </FormGroup>
    );
};

export default TransactionInputContainer;
