import React, { Component } from 'react';
import { Timer16 } from '@carbon/icons-react';
import { Button } from 'carbon-components-react';
import ITutorialObject from '../../../interfaces/ITutorialObject';
import { ExtensionCommands } from '../../../ExtensionCommands';
import Utils from '../../../Utils';
import './TutorialTile.scss';

interface IProps {
    tutorialObject: ITutorialObject;
}

class TutorialTile extends Component <IProps> {

    constructor(props: Readonly<IProps>) {
        super(props);

        this.populateObjectives = this.populateObjectives.bind(this);
        this.openTutorialHandler = this.openTutorialHandler.bind(this);
    }

    populateObjectives(): JSX.Element[] {
        const objectivesJSX: JSX.Element[] = [];
        for (const objective of this.props.tutorialObject.objectives) {
            objectivesJSX.push(<p className='objective'>{objective}</p>);
        }
        return objectivesJSX;
    }

    openTutorialHandler(): void {
        Utils.postToVSCode({
            command: ExtensionCommands.OPEN_REACT_TUTORIAL_PAGE,
            data: [
                this.props.tutorialObject.series,
                this.props.tutorialObject.title
            ]
        });
    }

    render(): JSX.Element {
        return (
            <div className='tab-container'>
                <div className='tutorial-title'>
                    {this.props.tutorialObject.title}
                </div>
                <div className='time-container'>
                    <Timer16 className='icon'></Timer16>
                    <span className='time-text'>{this.props.tutorialObject.length}</span>
                </div>
                <div className='tutorial-objectives'>
                    {this.populateObjectives()}
                </div>
                <div className='button-container'>
                    <Button className='pdf-button' kind='ghost' size='default'>Download as PDF</Button>
                    {this.props.tutorialObject.firstInSeries === true ?
                        <Button className='button' kind='primary' size='default' onClick={this.openTutorialHandler}>Open tutorial</Button> :
                        <Button className='button' kind='secondary' size='default' onClick={this.openTutorialHandler}>Open tutorial</Button>
                    }
                </div>
            </div>
        );
    }
}

export default TutorialTile;
