import React, { Component } from 'react';
import { Link } from 'carbon-components-react';
import Utils from '../../../Utils';

interface IProps {
    commandName: string;
    linkContents: string;
    className?: string;
    commandData?: any;
    id?: string;
}

class CommandLink extends Component<IProps> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.runCommand = this.runCommand.bind(this);
    }

    runCommand(): void {
        const message: {command: string, data?: any} = {
            command: this.props.commandName
        };
        if (this.props.commandData) {
            message.data = this.props.commandData;
        }

        Utils.postToVSCode(message);
    }

    render(): JSX.Element {
        const style: string = this.props.className ? this.props.className : '';

        return (
            <Link className={style} href='' onClick={this.runCommand} id={this.props.id}>
                {this.props.linkContents}
            </Link>
        );
    }

}

export default CommandLink;
