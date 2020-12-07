import React, { Component } from 'react';
import { CheckmarkOutline16, MisuseOutline16 } from '@carbon/icons-react';
import { Button } from 'carbon-components-react';
import ISampleObject from '../../../interfaces/ISampleObject';

import { ExtensionCommands } from '../../../ExtensionCommands';
import Utils from '../../../Utils';
import '../../../styles/gallery.scss';

interface IProps {
    repositoryName: string;
    sampleObject: ISampleObject;
}

class SampleTile extends Component <IProps> {

    constructor(props: Readonly<IProps>) {
        super(props);

        this.openSampleHandler = this.openSampleHandler.bind(this);
    }

    openSampleHandler(): void {
        Utils.postToVSCode({
            command: ExtensionCommands.OPEN_SAMPLE_PAGE,
            data: [
                this.props.repositoryName,
                this.props.sampleObject.name,
            ]
        });
    }

    render(): JSX.Element {
        return (
            <div className='tab-container'>
                <div className='title'>
                    {this.props.sampleObject.name}
                </div>
                <div className='badges'>

                    <div className='badge-container'>
                        {this.props.sampleObject.category.contracts && this.props.sampleObject.category.contracts.length > 0 ?
                            <CheckmarkOutline16 className='icon'></CheckmarkOutline16> :
                            <MisuseOutline16 className='icon'></MisuseOutline16>
                        }
                        <span className='text'>Sample contracts</span>
                    </div>

                    <div className='badge-container'>
                        {this.props.sampleObject.category.applications && this.props.sampleObject.category.applications.length > 0 ?
                            <CheckmarkOutline16 className='icon'></CheckmarkOutline16> :
                            <MisuseOutline16 className='icon'></MisuseOutline16>
                        }
                        <span className='text'>Sample applications</span>
                    </div>

                </div>
                <div className='objectives'>
                    {this.props.sampleObject.description}
                </div>
                <div className='button-container'>
                    <Button className='button' kind='primary' size='default' onClick={this.openSampleHandler}>Open sample</Button>
                </div>
            </div>
        );
    }
}

export default SampleTile;
