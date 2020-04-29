import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import DeployPage from '../../src/components/pages/DeployPage/DeployPage';

chai.should();
chai.use(sinonChai);

describe('DeployPage component', () => {

    const deployData: {channelName: string, environmentName: string} = {channelName: 'mychannel', environmentName: 'myEnvironment'};

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<DeployPage deployData={deployData} />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
