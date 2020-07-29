import React, { Component } from 'react';
import { Tile } from 'carbon-components-react';
import HeadingCombo from '../HeadingCombo/HeadingCombo';
import Utils from '../../../Utils';
import newTabImg from '../../../resources/new-tab.svg';
import './CommandTile.scss';

interface IProps {
    title: string;
    body: string;
    command: string;
    image?: string;
}

class CommandTile extends Component<IProps> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.tileClickHandler = this.tileClickHandler.bind(this);
    }

    tileClickHandler(): void {
        Utils.postToVSCode({
            command: this.props.command
        });
    }

    render(): JSX.Element {
        return (
            <Tile id='custom-tile-hack' className='custom-tile' onClick={this.tileClickHandler}>
                <HeadingCombo
                    headingText={this.props.title}
                    subheadingText={this.props.body}
                    image={this.props.image}
                />
                <img src={newTabImg} alt='' className='new-tab-img' />
            </Tile>
        );
    }
}

export default CommandTile;
