import React, { Component } from 'react';
import TutorialTabs from '../../elements/TutorialTabs/TutorialTabs';
import ITutorialObject from '../../../interfaces/ITutorialObject';
import '../../../styles/gallery.scss';

interface IProps {
    tutorialData: Array<{name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string}>;
}

class TutorialPage extends Component<IProps> {
    render(): JSX.Element {
        return (
            <div className='bx--grid gallery-page-container'>
                <div className='bx--row'>
                    <div className='gallery-page-description-container'>
                        <h3>Blockchain Tutorials</h3>
                        <p>
                            In these tutorials you will learn about Hyperledger Fabric development using IBM Blockchain Platform.
                        </p>
                    </div>
                </div>
                <div className='bx--row gallery-tabs-container'>
                    <div className='bx--col-lg-13 bx--col-md-8 bx--col-sm-4'>
                        <TutorialTabs tutorialData={this.props.tutorialData}/>
                    </div>
                </div>
            </div>
        );
    }
}

export default TutorialPage;
