import React, { Component } from 'react';
import HeadingCombo from '../../elements/HeadingCombo/HeadingCombo';
import './TutorialPage.scss';

class TutorialPage extends Component {
    render(): JSX.Element {
        return (
            <div className='bx--grid tutorial-page-container'>
                <div className='bx--row'>
                    <HeadingCombo
                        headingText='Blockchain Tutorials'
                        subheadingText='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
                    />
                </div>
            </div>
        );
    }
}

export default TutorialPage;
