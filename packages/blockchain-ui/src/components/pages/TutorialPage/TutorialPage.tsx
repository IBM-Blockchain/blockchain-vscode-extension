import React, { Component } from 'react';
import HeadingCombo from '../../elements/HeadingCombo/HeadingCombo';
import './TutorialPage.scss';

interface IProps {
    tutorialData: Array<{seriesName: string, seriesTutorials: any[]}>;
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
                <div className='bx--row'>
                    {/* this is where the tutorials will go */}
                </div>
            </div>
        );
    }
}

export default TutorialPage;
