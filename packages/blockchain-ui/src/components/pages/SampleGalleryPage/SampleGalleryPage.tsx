import React, { Component } from 'react';
import SampleTabs from '../../elements/SampleTabs/SampleTabs';
import '../../../styles/gallery.scss';
import IRepositoryObject from '../../../interfaces/IRepositoryObject';

interface IProps {
    repositoryData: {repositories: IRepositoryObject[]};
}

class SampleGalleryPage extends Component<IProps> {

    render(): JSX.Element {
        return (
            <div className='bx--grid gallery-page-container'>
                <div className='bx--row'>
                    <div className='gallery-page-description-container'>
                        <h3>Blockchain Samples</h3>
                        <p>
                            In these samples you can see best practices and techniques for interacting with Hyperledger Fabric smart contracts and applications.
                            <br/>
                            <br/>
                        </p>
                    </div>
                </div>
                <div className='bx--row gallery-tabs-container'>
                    <div className='bx--col-lg-13 bx--col-md-8 bx--col-sm-4'>
                        <SampleTabs repositoryData={this.props.repositoryData}/>
                    </div>
                </div>
            </div>
        );
    }
}

export default SampleGalleryPage;
