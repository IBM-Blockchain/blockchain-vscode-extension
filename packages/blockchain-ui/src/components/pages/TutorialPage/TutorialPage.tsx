import React, { Component } from 'react';
import HeadingCombo from '../../elements/HeadingCombo/HeadingCombo';
import TutorialTabs from '../../elements/TutorialTabs/TutorialTabs';
import ITutorialObject from '../../../interfaces/ITutorialObject';
import './TutorialPage.scss';

interface IProps {
    tutorialData: Array<{name: string, tutorials: ITutorialObject[]}>;
}

class TutorialPage extends Component<IProps> {
    render(): JSX.Element {
        return (
            <div className='bx--grid tutorial-page-container'>
                <div className='bx--row'>
                    <HeadingCombo
                        headingText='Blockchain Tutorials'
                        subheadingText='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
                    />
                </div>
                <div className='bx--row' id='tutorial-tabs-container'>
                    <TutorialTabs tutorialData={this.props.tutorialData}/>
                </div>
            </div>
        );
    }
}

export default TutorialPage;
