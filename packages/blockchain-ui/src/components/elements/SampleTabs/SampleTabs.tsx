import React, { Component } from 'react';
import { Tabs, Tab } from 'carbon-components-react';
import SampleTile from '../SampleTile/SampleTile';
import '../../../styles/gallery.scss';
import IRepositoryObject from '../../../interfaces/IRepositoryObject';

// tslint:disable: typedef

interface IProps {
    repositoryData: {repositories: IRepositoryObject[]};
}

class SampleTabs extends Component<IProps> {

    createTabs(): Array<JSX.Element> {
        const tabArray: JSX.Element[] = [];
        for (let index: number = 0; index < this.props.repositoryData.repositories.length; index++) {
            const repository: IRepositoryObject = this.props.repositoryData.repositories[index];
            const tabLabel: string = `${repository.name} (${repository.samples.length})`;
            tabArray.push(
                // @ts-ignore
                <Tab
                    href='#'
                    tabIndex={index}
                    label={tabLabel}
                >
                    {this.populateTabs(repository)}
                </Tab>
            );
        }
        // });
        return tabArray;
    }
 populateTabs(repository: IRepositoryObject): Array<JSX.Element> {
        const samplesJSX: JSX.Element[] = [];
        for (const sample of repository.samples) {
            samplesJSX.push(
                <SampleTile sampleObject={sample} repositoryName={repository.name}/>
            );
            samplesJSX.push(<br/>);
        }
        return samplesJSX;
    }

    render(): JSX.Element {
        let tabs: JSX.Element[] | JSX.Element;

        if (this.props.repositoryData.repositories.length > 0) {
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
                <div className='sample-tabs-background'></div>
                {tabs}
            </>
        );
    }
}

export default SampleTabs;
