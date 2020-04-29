import React, { Component } from 'react';
import { ProgressIndicator, ProgressStep } from 'carbon-components-react';
import './DeployProgressBar.scss';

interface IProps {
    //
}

class DeployProgressBar extends Component<IProps> {

    // For the deploy progress bar

    render(): JSX.Element {
        return (
            <div className='bx--col'>
                <br/>
                <br/>

                <ProgressIndicator currentIndex={0} vertical={false}>

                    <ProgressStep
                        label='Step 1'
                        secondaryLabel='Choose smart contract'
                        description=''

                    />
                    <ProgressStep
                        label='Step 2'
                        secondaryLabel='Create definition'
                        description=''

                    />
                    <ProgressStep
                        label='Step 3'
                        secondaryLabel='Deploy'
                        description=''
                    />

                </ProgressIndicator>

                <br/>
                <br/>
                <br/>
            </div>
        );
    }
}

export default DeployProgressBar;
