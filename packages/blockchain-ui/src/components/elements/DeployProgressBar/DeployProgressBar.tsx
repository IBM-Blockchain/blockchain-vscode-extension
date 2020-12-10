import React, { Component } from 'react';
import { ProgressIndicator, ProgressStep } from 'carbon-components-react';
import './DeployProgressBar.scss';

interface IProps {
    currentIndex: number;
    hasV1Capabilities: boolean;
}

class DeployProgressBar extends Component<IProps> {

    // For the deploy progress bar

    render(): JSX.Element {
        const stepTwoLabel: string = this.props.hasV1Capabilities ? 'Configure smart contract deployment' : 'Create definition';
        return (
            <div className='bx--col-lg-10'>
                <ProgressIndicator currentIndex={this.props.currentIndex} vertical={false}>

                    <ProgressStep
                        label='Step 1'
                        secondaryLabel='Choose smart contract'
                        description=''

                    />
                    <ProgressStep
                        label='Step 2'
                        secondaryLabel={stepTwoLabel}
                        description=''

                    />
                    <ProgressStep
                        label='Step 3'
                        secondaryLabel='Deploy'
                        description=''
                    />

                </ProgressIndicator>
            </div>
        );
    }
}

export default DeployProgressBar;
