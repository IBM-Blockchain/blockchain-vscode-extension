import React, { Component } from 'react';
import './InlineSelect.scss';
import { Select } from 'carbon-components-react';

interface IProps {
    id: string;
    labelText: string;
    contents: Array<JSX.Element>;
    onChangeCallback: (event: React.FormEvent<HTMLSelectElement>) => void;
}

class InlineSelect extends Component<IProps> {

    constructor(props: Readonly<IProps>) {
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
            <div id={this.props.id + '-wrapper'}>
                <Select id={this.props.id} labelText={this.props.labelText} className='inline-select' onChange={this.props.onChangeCallback}>
                    {this.props.contents}
                </Select>
            </div>
        );
    }

}

export default InlineSelect;
