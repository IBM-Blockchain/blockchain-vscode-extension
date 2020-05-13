import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import ButtonList from '../../src/components/elements/ButtonList/ButtonList';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('ButtonList component', () => {
    let mySandBox: sinon.SinonSandbox;

    let onProgressChangeStub: sinon.SinonStub;
    let onDeployClickedStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        onProgressChangeStub = mySandBox.stub();
        onDeployClickedStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<ButtonList currentIndex={0} disableNext={false} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should render button for Step One', () => {
            const component: ReactWrapper<ButtonList> = mount(<ButtonList currentIndex={0} disableNext={false} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />);
            const buttonContainer: ReactWrapper<any> = component.at(0);

            const children: ReactWrapper<JSX.Element> = buttonContainer.children();
            const nextButton: ReactWrapper<JSX.Element> = children.childAt(0);
            nextButton.text().should.equal('Next');

            const props: any = nextButton.props();

            props.disabled.should.equal(false);
        });

        it('should disable button if no package selected', () => {
            const component: ReactWrapper<ButtonList> = mount(<ButtonList currentIndex={0} disableNext={true} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />);
            const buttonContainer: ReactWrapper<any> = component.at(0);

            const children: ReactWrapper<JSX.Element> = buttonContainer.children();
            const nextButton: ReactWrapper<JSX.Element> = children.childAt(0);
            const props: any = nextButton.props();
            props.disabled.should.equal(true);
        });

        it('should render buttons for Step Two', () => {
            const component: ReactWrapper<ButtonList> = mount(<ButtonList currentIndex={1} disableNext={false} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />);
            const buttonContainer: ReactWrapper<any> = component.at(0);

            const children: ReactWrapper<JSX.Element> = buttonContainer.children();
            const backButton: ReactWrapper<JSX.Element> = children.childAt(0);
            backButton.text().should.equal('Back');

            const nextButton: any = children.childAt(1);
            nextButton.text().should.equal('Next');
            const props: any = nextButton.props();
            props.disabled.should.equal(false);
        });

        it('should render buttons for Step Three', () => {
            const component: ReactWrapper<ButtonList> = mount(<ButtonList currentIndex={2} disableNext={false} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />);
            const buttonContainer: ReactWrapper<any> = component.at(0);

            const children: ReactWrapper<JSX.Element> = buttonContainer.children();
            const backButton: ReactWrapper<JSX.Element> = children.childAt(0);
            backButton.text().should.equal('Back');

            const deployButton: ReactWrapper<JSX.Element> = children.childAt(1);
            deployButton.text().should.equal('Deploy');
            const props: any = deployButton.props();
            props.disabled.should.equal(false);
        });
    });

    describe('incrementIndex', () => {
        it('should increment progress index', () => {
            const component: ReactWrapper<ButtonList> = mount(<ButtonList currentIndex={0} disableNext={false} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />);
            const instance: ButtonList = component.instance() as ButtonList;
            instance.incrementIndex();

            onProgressChangeStub.should.have.been.calledOnceWithExactly(1);
        });
    });

    describe('decrementIndex', () => {
        it('should decrement progress index', () => {
            const component: ReactWrapper<ButtonList> = mount(<ButtonList currentIndex={1} disableNext={false} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />);
            const instance: ButtonList = component.instance() as ButtonList;
            instance.decrementIndex();

            onProgressChangeStub.should.have.been.calledOnceWithExactly(0);
        });
    });

    describe('deploy', () => {
        it('should trigger deploy', () => {
            const component: ReactWrapper<ButtonList> = mount(<ButtonList currentIndex={1} disableNext={false} onProgressChange={onProgressChangeStub} onDeployClicked={onDeployClickedStub} />);
            const instance: ButtonList = component.instance() as ButtonList;
            instance.deploy();

            onDeployClickedStub.should.have.been.calledOnce;
        });
    });

});
