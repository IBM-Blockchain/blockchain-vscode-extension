import React, { Component } from 'react';
import { Tile } from 'carbon-components-react';
import HeadingCombo from '../HeadingCombo/HeadingCombo';
import { ExtensionCommands } from '../../../ExtensionCommands';
import Utils from '../../../Utils';
import newTabImg from '../../../resources/new-tab.svg';
import './CustomTile.scss';

interface IProps {
    title: string;
    body: string;
}

class CustomTile extends Component <IProps> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.tileClickHandler = this.tileClickHandler.bind(this);
    }

    tileClickHandler(): void {
        Utils.postToVSCode({
            command: ExtensionCommands.OPEN_TUTORIAL_GALLERY
        });
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

export default CustomTile;
