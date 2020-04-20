import React, { Component } from 'react';
import './TutorialTile.scss';
import { Timer16 } from '@carbon/icons-react';
import { Button } from 'carbon-components-react';

interface IProps {
    tutorialObject: any;
}

class TutorialTile extends Component <IProps> {

    constructor(props: Readonly<IProps>) {
        super(props);

        this.populateObjectives = this.populateObjectives.bind(this);
    }

    populateObjectives(): JSX.Element[] {
        const objectivesJSX: JSX.Element[] = [];
        for (const objective of this.props.tutorialObject.objectives) {
            objectivesJSX.push(<p className='objective'>{objective}</p>);
        }
        return objectivesJSX;
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
                        <Button className='button' kind='primary' size='default'>Open tutorial</Button> :
                        <Button className='button' kind='secondary' size='default'>Open tutorial</Button>
                    }
                </div>
            </div>
        );
    }
}

export default TutorialTile;
