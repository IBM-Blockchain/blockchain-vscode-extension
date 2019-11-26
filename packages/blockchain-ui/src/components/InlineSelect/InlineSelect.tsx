import React, { Component } from 'react';
import './InlineSelect.scss';
import { Select } from 'carbon-components-react';

interface InlineSelectProps {
    id: string;
    labelText: string;
    contents: Array<JSX.Element>;
    onChangeCallback: (event: React.FormEvent<HTMLSelectElement>) => void;
}

interface InlineSelectState {
    id: string;
    labelText: string;
    contents: Array<JSX.Element>;
    onChangeCallback: (event: React.FormEvent<HTMLSelectElement>) => void;
}

class InlineSelect extends Component<InlineSelectProps, InlineSelectState> {

    constructor(props: Readonly<InlineSelectProps>) {
        super(props);
        this.state = {
            id: this.props.id,
            labelText: this.props.labelText,
            contents: this.props.contents,
            onChangeCallback: this.props.onChangeCallback
        };
    }

    render(): JSX.Element {
        return (
            <div id={this.state.id + '-wrapper'}>
                <Select id={this.state.id} labelText={this.state.labelText} className='inline-select' onChange={this.state.onChangeCallback}>
                    {this.state.contents}
                </Select>
            </div>
        );
    }

}

export default InlineSelect;
