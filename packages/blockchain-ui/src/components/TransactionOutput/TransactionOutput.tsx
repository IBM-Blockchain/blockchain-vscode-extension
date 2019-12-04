import React, { Component } from 'react';
import './TransactionOutput.scss';

interface OutputProps {
    output: string;
}

interface OutputState {
    output: string;
}

class TransactionOutput extends Component<OutputProps, OutputState> {
    constructor(props: Readonly<OutputProps>) {
        super(props);
        this.state = {
            output: this.props.output
        };
        this.determineOutput = this.determineOutput.bind(this);
    }

    componentDidUpdate(prevProps: OutputProps): void {
        if (prevProps.output !== this.props.output) {
            this.setState({
                output: this.props.output
            });
        }
    }

    determineOutput(): Array<JSX.Element>  {
        const outputArray: Array<JSX.Element> = [];
        if (this.state.output === '') {
            outputArray.push(<p className='output-body'>No transaction output available. Submit/evaluate to produce an output.</p>);
        } else {
            const outputStrings: Array<string> = this.state.output.split('\n');
            for (const output of outputStrings) {
                outputArray.push(<p className='output-body'>{output}</p>);
            }
        }
        return outputArray;
    }

    render(): JSX.Element {
        return (
            <div className='output-panel' id='output-panel'>
                <p className='output-title'>Output for untitled transaction</p>
                {this.determineOutput()}
            </div>
        );
    }
}

export default TransactionOutput;
