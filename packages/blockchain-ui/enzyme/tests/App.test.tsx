// tslint:disable: no-unused-expression
import React from 'react';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import App from '../../src/App';

chai.should();
chai.use(sinonChai);

describe('App', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should redirect to the home page', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/home',
                version: '1.0.0'
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/home');
        component.state().extensionVersion.should.equal('1.0.0');
    });

    it('should redirect to the tutorial page', async () => {
        const tutorialData: Array<{seriesName: string, seriesTutorials: any[]}> = [
            {
                seriesName: 'Basic tutorials',
                seriesTutorials: [
                    {
                        title: 'a1',
                        length: '4 weeks',
                        objectives: [
                            'objective 1',
                            'objective 2',
                            'objective 3'
                        ],
                        file: 'some/file/path'
                    }
                ]
            },
            {
                seriesName: 'Other tutorials',
                seriesTutorials: [
                    {
                        title: 'something really interesting',
                        length: '10 minutes',
                        objectives: [
                            'objective 1',
                            'objective 2',
                            'objective 3'
                        ],
                        file: 'another/file/path'
                    }
                ]
            }
        ];

        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/tutorials',
                tutorialData
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/tutorials');
        component.state().tutorialData.should.equal(tutorialData);
    });
});
