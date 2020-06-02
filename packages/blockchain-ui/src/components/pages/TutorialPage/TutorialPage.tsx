import React, { Component } from 'react';
import TutorialTabs from '../../elements/TutorialTabs/TutorialTabs';
import ITutorialObject from '../../../interfaces/ITutorialObject';
import './TutorialPage.scss';
import { Link } from 'carbon-components-react';

interface IProps {
    tutorialData: Array<{name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string}>;
}

class TutorialPage extends Component<IProps> {
    render(): JSX.Element {
        return (
            <div className='bx--grid tutorial-page-container'>
                <div className='bx--row'>
                    <div className='tutorial-page-description-container'>
                        <h3>Blockchain Tutorials</h3>
                        <p>
                            In these tutorials you will learn about Hyperledger Fabric development using IBM Blockchain Platform.
                            <br/>
                            As you complete the learning objectives you will be invited to gain <Link id='acclaim-link' href='https://www.youracclaim.com/'>accredited badges</Link> from IBM.
                        </p>
                    </div>
                </div>
                <div className='bx--row' id='tutorial-tabs-container'>
                    <div className='bx--col-lg-13 bx--col-md-8 bx--col-sm-4'>
                        <TutorialTabs tutorialData={this.props.tutorialData}/>
                    </div>
                </div>
            </div>
        );
    }
}

export default TutorialPage;
