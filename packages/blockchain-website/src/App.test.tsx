import React from 'react';
import renderer from 'react-test-renderer';
import App from './App';
import chai from 'chai';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('App', () => {
    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<App />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
