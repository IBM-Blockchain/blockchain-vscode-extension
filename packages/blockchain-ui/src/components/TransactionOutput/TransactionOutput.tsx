import React, { Component } from 'react';
import './TransactionOutput.scss';
import IOutputObject from '../../interfaces/IOutputObject';

interface OutputProps {
    output: IOutputObject | undefined;
}

interface OutputState {
    outputArray: Array<IOutputObject>;
}

class TransactionOutput extends Component<OutputProps, OutputState> {
    constructor(props: Readonly<OutputProps>) {
        super(props);
        this.state = {
            outputArray: this.props.output ? [this.props.output] : []
        };
        this.renderOutput = this.renderOutput.bind(this);
    }

    componentDidUpdate(prevProps: OutputProps): void {
        if (prevProps.output !== this.props.output) {
            const updatedOutputArray: Array<IOutputObject> = this.state.outputArray;
            if (this.props.output !== undefined) {
                updatedOutputArray.push(this.props.output);
                this.setState({
                    outputArray: updatedOutputArray
                });
            }
        }
    }

    formatOutputObject(outputObj: IOutputObject): JSX.Element {
        return (
            <div className='output-object'>
                <p>{outputObj.transactionName} {outputObj.action} [{outputObj.startTime}]</p>
                <p>Result: {outputObj.result} [{outputObj.endTime}]</p>
                <div className='output-object-io'>
                    <p className='output-io-heading'>Input:</p>
                    <p>Args: [{outputObj.args.toString()}]</p>
                    {outputObj.transientData && <p>Transient data: {outputObj.transientData}</p>}
                    <p className='output-io-heading'>Output:</p>
                    <p>{outputObj.output}</p>
                </div>
            </div>
        );
    }

    renderOutput(): Array<JSX.Element> {
        const outputJSX: Array<JSX.Element> = [];
        if (!this.state.outputArray.length) {
            outputJSX.push(<p>No transaction output available. Submit/evaluate to produce an output.</p>);
        } else {
            for (const output of this.state.outputArray) {
                outputJSX.push(this.formatOutputObject(output));
            }
        }
        return outputJSX;
    }

    render(): JSX.Element {
        return (
            <div className='output-panel' id='output-panel'>
                <p className='output-title'>Output for untitled transaction</p>
                <div className='output-body'>
                    {this.renderOutput()}
                </div>
            </div>
        );
    }
}

export default TransactionOutput;
