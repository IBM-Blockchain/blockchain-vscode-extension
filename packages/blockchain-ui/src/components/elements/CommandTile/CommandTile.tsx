import React, { Component } from 'react';
import { Tile } from 'carbon-components-react';
import HeadingCombo from '../HeadingCombo/HeadingCombo';
import Utils from '../../../Utils';
import newTabImg from '../../../resources/new-tab.svg';
import './CommandTile.scss';

interface IProps {
    title: string;
    body: string;
    options: { actionType: 'app' | 'vscode', command?: string, path?: string };
}

class CommandTile extends Component <IProps> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.tileClickHandler = this.tileClickHandler.bind(this);
    }

    tileClickHandler(): void {
        if (this.props.options.actionType === 'app') {
            Utils.changeRoute(this.props.options.path);
        } else {
            Utils.postToVSCode({
                command: this.props.options.command
            });
        }
    }

    render(): JSX.Element {
        return (
            <Tile className='custom-tile' onClick={this.tileClickHandler}>
                <HeadingCombo
                    headingText={this.props.title}
                    subheadingText={this.props.body}
                />
                <img src={newTabImg} alt='' className='new-tab-img'/>
            </Tile>
        );
    }
}

export default CommandTile;
