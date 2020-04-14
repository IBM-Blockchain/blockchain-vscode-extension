import React, { Component } from 'react';
import './TutorialTile.scss';
import { Timer16 } from '@carbon/icons-react';
import { Button } from 'carbon-components-react';

interface IProps {
    tutorialObject: any;
}

class TutorialTile extends Component <IProps> {

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
                    <p className='objective'>Learn about what blockchain is and why its important</p>
                    <p className='objective'>Learn about the Linux Foundation Hyperledger Project and Hyperledger Fabric</p>
                    <p className='objective'>Learn about IBM Blockchain Platform and the VS Code extension</p>
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
