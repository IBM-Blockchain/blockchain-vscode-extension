import React, { Component } from 'react';
import { Link } from 'carbon-components-react';
import Utils from '../../../Utils';

interface IProps {
    linkContents: string;
    url: string;
    className?: string;
    id?: string;
}

class TelemetryLink extends Component<IProps> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.sendTelemetryAndOpen = this.sendTelemetryAndOpen.bind(this);
    }

    sendTelemetryAndOpen(): void {
        Utils.postToVSCode({
            command: 'telemetry',
            data: this.props.linkContents
        });
    }

    render(): JSX.Element {
        return (
            <Link className={this.props.className} href={this.props.url} onClick={this.sendTelemetryAndOpen} id={this.props.id}>
                {this.props.linkContents}
            </Link>
        );
    }
}

export default TelemetryLink;
