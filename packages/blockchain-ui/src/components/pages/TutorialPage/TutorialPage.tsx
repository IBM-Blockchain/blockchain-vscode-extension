import React, { Component } from 'react';
import HeadingCombo from '../../elements/HeadingCombo/HeadingCombo';
import TutorialTabs from '../../elements/TutorialTabs/TutorialTabs';
import './TutorialPage.scss';

interface IProps {
    tutorialData: Array<{seriesName: string, seriesTutorials: any[]}>;
}

class TutorialPage extends Component<IProps> {
    render(): JSX.Element {
        return (
            <>
                <div className='tutorial-page-background' id='tutorial-page-background'/>
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
            </>
        );
    }
}

export default TutorialPage;
