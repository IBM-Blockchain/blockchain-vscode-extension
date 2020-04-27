import React, { Component } from 'react';
import { Tabs, Tab } from 'carbon-components-react';
import TutorialTile from '../TutorialTile/TutorialTile';
import ITutorialObject from '../../../interfaces/ITutorialObject';
import './TutorialTabs.scss';

interface IProps {
    tutorialData: Array<{name: string, tutorials: ITutorialObject[]}>;
}

class TutorialTabs extends Component<IProps> {

    createTabs(): Array<JSX.Element> {
        const tabArray: JSX.Element[] = [];
        this.props.tutorialData.map((tutorialSeries: {name: string, tutorials: ITutorialObject[]}, index: number) => {
            const tabLabel: string = `${tutorialSeries.name} (${tutorialSeries.tutorials.length})`;
            tabArray.push(
                // @ts-ignore
                <Tab
                    href='#'
                    tabIndex={index}
                    label={tabLabel}
                >
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
