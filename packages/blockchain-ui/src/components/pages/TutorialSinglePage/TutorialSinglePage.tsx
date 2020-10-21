import React, { FunctionComponent } from 'react';
import TutorialMarkdown from '../../elements/TutorialMarkdown/TutorialMarkdown';
import ITutorialObject from '../../../interfaces/ITutorialObject';

interface IProps {
    tutorialData: Array<{name: string, tutorials: any, tutorialFolder: string, tutorialDescription?: string}>;
    tutorial: ITutorialObject;
}

const TutorialPage: FunctionComponent<IProps> = ({ tutorial, tutorialData }) => {
    return (
        <div className='bx--grid tutorial-page-container'>
            <div className='bx--row'>
                <TutorialMarkdown tutorial={tutorial} tutorialData={tutorialData} />
            </div>
        </div>
    );
};

export default TutorialPage;
