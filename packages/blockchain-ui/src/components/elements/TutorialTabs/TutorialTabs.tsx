import React, { Component } from 'react';
import { Tabs, Tab, Link } from 'carbon-components-react';
import TutorialTile from '../TutorialTile/TutorialTile';
import ITutorialObject from '../../../interfaces/ITutorialObject';
import './TutorialTabs.scss';
import Utils from '../../../Utils';
import { ExtensionCommands } from '../../../ExtensionCommands';

// tslint:disable: typedef

interface IProps {
    tutorialData: Array<{name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string}>;
}

class TutorialTabs extends Component<IProps> {

    savePDFHandler(tutorialFolder: string): void {
        Utils.postToVSCode({
            command: ExtensionCommands.SAVE_TUTORIAL_AS_PDF,
            data: [
                undefined,
                true,
                tutorialFolder
            ]
        });
    }

    createTabs(): Array<JSX.Element> {
        const tabArray: JSX.Element[] = [];
        this.props.tutorialData.map((tutorialSeries: {name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string}, index: number) => {
            const tabLabel: string = `${tutorialSeries.name} (${tutorialSeries.tutorials.length})`;
            tabArray.push(
                // @ts-ignore
                <Tab
                    href='#'
                    tabIndex={index}
                    label={tabLabel}
                >
                    {tutorialSeries.name === 'Basic tutorials' || tutorialSeries.name === 'Joining a network' ?
                        <div className='series-description-container'>
                            <p className='series-description'>{tutorialSeries.tutorialDescription}</p>
                            <Link id='download-all-link' className='download-all' href='#' onClick={() => this.savePDFHandler(tutorialSeries.tutorialFolder)}>{`Download all "${tutorialSeries.name}" as PDF`}</Link>
                        </div> :
                        <></>
                    }
                    {this.populateTabs(tutorialSeries.tutorials)}
                </Tab>
            );
        });
        return tabArray;
    }
 populateTabs(tutorials: ITutorialObject[]): Array<JSX.Element> {
        const tutorialsJSX: JSX.Element[] = [];
        for (const tutorial of tutorials) {
            tutorialsJSX.push(
                <TutorialTile tutorialObject={tutorial}/>
            );
            tutorialsJSX.push(<br/>);
        }
        return tutorialsJSX;
    }

    render(): JSX.Element {
        let tabs: JSX.Element[] | JSX.Element;

        if (this.props.tutorialData.length > 0) {
            tabs = (
                // @ts-ignore
                <Tabs triggerHref='#' type='container'>
                    {this.createTabs()}
                </Tabs>
            );
        } else {
            tabs = (<></>);
        }

        return (
            <>
                <div className='tutorial-tabs-background'></div>
                {tabs}
            </>
        );
    }
}

export default TutorialTabs;
