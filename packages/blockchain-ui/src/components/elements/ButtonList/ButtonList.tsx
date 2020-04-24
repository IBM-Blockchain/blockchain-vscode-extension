import React, { Component } from 'react';
import './ButtonList.scss';
import { Button } from 'carbon-components-react';

interface IProps {
    buttons: any[];
}

class ButtonList extends Component<IProps> {

    // This element will probably just be an array of button elements.
    // Will then loop through the array and render the buttons.
    // E.g. this could have 'Back', 'Next' buttons inline next to each other.

    // This should also make it easy to add/remove buttons from this list.
    // E.g. Remove 'Next' button and add 'Finish' button.

    render(): JSX.Element {

        const buttonList: JSX.Element[] = [];
        for (const button of this.props.buttons) {
            buttonList.push(<Button kind={button.kind} disabled={button.disabled}>{button.label}</Button>);
        }

        return (
            <div className='bx--btn-set'>
                {buttonList}
            </div>
        );
    }
}

export default ButtonList;
