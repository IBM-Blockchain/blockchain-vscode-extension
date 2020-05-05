import React, { Component } from 'react';
import './ButtonList.scss';
import { Button } from 'carbon-components-react';

interface ButtonListProps {
    onProgressChange: (newIndex: number) => void;
    onDeployClicked: () => void;
    currentIndex: number;
    disableNext: boolean; // Disable Next button?
}

class ButtonList extends Component<ButtonListProps> {

    constructor(props: Readonly<ButtonListProps>) {
        super(props);

        this.incrementIndex = this.incrementIndex.bind(this);
        this.decrementIndex = this.decrementIndex.bind(this);
        this.deploy = this.deploy.bind(this);

    }

    render(): JSX.Element {
        const buttonList: JSX.Element[] = [];

        if (this.props.currentIndex === 0) {
            buttonList.push(<Button key='next' kind='primary' disabled={this.props.disableNext} onClick={this.incrementIndex}>Next</Button>);
        } else if (this.props.currentIndex === 1) {
            buttonList.push(<Button key='back' kind='secondary' onClick={this.decrementIndex}>Back</Button>);
            buttonList.push(<Button key='next' kind='primary' disabled={this.props.disableNext} onClick={this.incrementIndex}>Next</Button>);
        } else {
            buttonList.push(<Button key='back' kind='secondary' onClick={this.decrementIndex}>Back</Button>);
            buttonList.push(<Button key='next' kind='primary' onClick={this.deploy}>Deploy</Button>);
        }

        return (
            <div id='buttonList'>
                {buttonList}
            </div>
        );
    }

    incrementIndex(): void {
        const newIndex: number = this.props.currentIndex + 1;
        this.props.onProgressChange(newIndex);
    }

    decrementIndex(): void {
        const newIndex: number = this.props.currentIndex - 1;
        this.props.onProgressChange(newIndex);
    }

    deploy(): void {
        this.props.onDeployClicked();
    }
}

export default ButtonList;
