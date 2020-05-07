///  <reference types="Cypress" />
import ITutorialObject from '../../src/interfaces/ITutorialObject';
chai.should();

describe('Tutorial page', () => {

    const tutorialData: Array<{name: string, tutorials: Array<ITutorialObject>}> = [
        {
            name: 'Basic tutorials',
            tutorials: [
                {
                    title: 'a1',
                    series: 'Basic tutorials',
                    length: '4 weeks',
                    firstInSeries: true,
                    objectives: [
                        'objective 1',
                        'objective 2',
                        'objective 3'
                    ],
                    file: 'some/file/path'
                }
            ],
        },
        {
            name: 'Other tutorials',
            tutorials: [
                {
                    title: 'something really interesting',
                    series: 'Other tutorials',
                    length: '10 minutes',
                    objectives: [
                        'objective 4',
                        'objective 5',
                        'objective 6'
                    ],
                    file: 'another/file/path'
                }
            ]
        }
    ];

    const mockMessage: {path: string, tutorialData: Array<{name: string, tutorials: any[]}>} = {
        path: 'tutorials',
        tutorialData
    };

    beforeEach(() => {
        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });
    });

    it(`should correctly render the tabs and their contents`, () => {
        let currentTutorial: ITutorialObject = tutorialData[0].tutorials[0];

        cy.get('.bx--tabs__nav-item--selected > .bx--tabs__nav-link').contains(tutorialData[0].name);
        cy.get('.download-all').contains(`Download all "${currentTutorial.series}" as PDF`);
        cy.get('[aria-hidden="false"] > .tab-container').contains(currentTutorial.title);
        cy.get('[aria-hidden="false"] > .tab-container').contains(currentTutorial.length);

        cy.get('[aria-hidden="false"] > .tab-container > .tutorial-objectives > :nth-child(1)').contains(currentTutorial.objectives[0]);
        cy.get('[aria-hidden="false"] > .tab-container > .tutorial-objectives > :nth-child(2)').contains(currentTutorial.objectives[1]);
        cy.get('[aria-hidden="false"] > .tab-container > .tutorial-objectives > :nth-child(3)').contains(currentTutorial.objectives[2]);

        cy.get('[aria-hidden="false"] > .tab-container > .button-container > .pdf-button').contains('Download as PDF');
        cy.get('[aria-hidden="false"] > .tab-container > .button-container > .button').contains('Open tutorial');

        currentTutorial = tutorialData[1].tutorials[0];
        cy.get('[aria-selected="false"] > .bx--tabs__nav-link').click();

        cy.get('.bx--tabs__nav-item--selected > .bx--tabs__nav-link').contains(tutorialData[1].name);
        cy.get('[aria-hidden="false"] > .tab-container').contains(currentTutorial.title);
        cy.get('[aria-hidden="false"] > .tab-container').contains(currentTutorial.length);

        cy.get('[aria-hidden="false"] > .tab-container > .tutorial-objectives > :nth-child(1)').contains(currentTutorial.objectives[0]);
        cy.get('[aria-hidden="false"] > .tab-container > .tutorial-objectives > :nth-child(2)').contains(currentTutorial.objectives[1]);
        cy.get('[aria-hidden="false"] > .tab-container > .tutorial-objectives > :nth-child(3)').contains(currentTutorial.objectives[2]);

        cy.get('[aria-hidden="false"] > .tab-container > .button-container > .button').contains('Open tutorial');

    });
});
