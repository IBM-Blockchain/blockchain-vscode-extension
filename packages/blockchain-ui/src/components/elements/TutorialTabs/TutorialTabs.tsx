import React, { Component } from 'react';
import { Tabs, Tab } from 'carbon-components-react';
import './TutorialTabs.scss';
import TutorialTile from '../TutorialTile/TutorialTile';

interface IProps {
    tutorialData: Array<{seriesName: string, seriesTutorials: any[]}>;
}

class TutorialTabs extends Component<IProps> {

    createTabs(): Array<JSX.Element> {
        const tabArray: JSX.Element[] = [];
        this.props.tutorialData.map((tutorialSeries: {seriesName: string, seriesTutorials: any[]}, index: number) => {
            const tabLabel: string = `${tutorialSeries.seriesName} (${tutorialSeries.seriesTutorials.length})`;
            tabArray.push(
                // @ts-ignore
                <Tab
                    href='#'
                    tabIndex={index}
                    label={tabLabel}
                >
                    {this.populateTabs(tutorialSeries.seriesTutorials)}
                </Tab>
            );
        });
        return tabArray;
    }

    populateTabs(seriesTutorials: any[]): Array<JSX.Element> {
        const tutorialNameArray: JSX.Element[] = [];
        for (const tutorial of seriesTutorials) {
            tutorialNameArray.push(
                <TutorialTile tutorialObject={tutorial}/>
            );
        }
        return tutorialNameArray;
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
