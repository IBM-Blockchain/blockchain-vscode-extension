import React, { FunctionComponent, ReactElement } from 'react';
import path from 'path';
import unified from 'unified';
import parse from 'remark-parse';
import remark2html from 'remark-html';
import ReactHtmlParser, { convertNodeToElement, processNodes } from 'react-html-parser';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrow, tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import './TutorialMarkdown.scss';
import { ExtensionCommands } from '../../../ExtensionCommands';
import CommandLink from '../../elements/CommandLink/CommandLink';
import ITutorialObject from '../../../interfaces/ITutorialObject';
import ibpIcon from '../../../resources/ibp.png';

interface IProps {
    tutorial: ITutorialObject;
    tutorialData: any;
}

// isUrlAbsolute : returns whether a url is absolute (http, https, mailto) or not
const isUrlAbsolute: any = (url: string) => (url.includes('://') || url.indexOf('//') === 0);

// createTutorialLink : returns a command link to open a tutorial
const createTutorialLink: any = (tutorial: ITutorialObject, linkContents: any): ReactElement => {
    return (
        <CommandLink
            linkContents={linkContents}
            commandName={ExtensionCommands.OPEN_TUTORIAL_PAGE}
            commandData={[tutorial.series, tutorial.title]}
        />
    );
};

// createVscodeLink : returns a command link to open a vscode page
const createVscodeLink: any = (href: string, linkContents: any) => {
    return (
        <CommandLink
            linkContents={linkContents}
            commandName={ExtensionCommands.OPEN_VSCODE_EXTENSION}
            commandData={[href]}
        />
    );
};

// getPreviousAndNextTutorial : creates a CommandLink for the next and previous tutorial buttons
const getPreviousAndNextTutorialLinks: any = (tutorials: any, seriesName: string, tutorialTitle: string) => {
    const series: { tutorials: any } = tutorials.find(({ name }: { name: string }) => name === seriesName);

    let previousTutorial: ReactElement = <></>;
    let nextTutorial: ReactElement = <></>;

    if (series && series.tutorials && series.tutorials.length > 0) {
        const arr: Array<any> = series.tutorials;
        const tutorialIndex: number = arr.findIndex(({ title }: { title: string }) => title === tutorialTitle);

        if (arr[tutorialIndex - 1]) {
            const pt: ITutorialObject = arr[tutorialIndex - 1];
            previousTutorial = (
              <div className='tutorial-previous'>
                  {createTutorialLink(pt, `← ${pt.title}`)}
              </div>
            );
        }

        if (arr[tutorialIndex + 1]) {
            const nt: ITutorialObject = arr[tutorialIndex + 1];
            nextTutorial = (
                <div className='tutorial-next'>
                    {createTutorialLink(nt, `→ ${nt.title}`)}
                </div>
            );
        }
    }
    return [previousTutorial, nextTutorial];
};

// convertRelativePathToTutorial : takes a relative path to a tutorial from the markdown document and matches it with a tutorial
const convertRelativePathToTutorial: any = (relativeTutorialHref: string, tutorialData: any) => {
    const filename: string = path.basename(relativeTutorialHref);
    const validTutorials: any = tutorialData.map((series: any) => series.tutorials.find((tutorial: any) => tutorial.file.endsWith(filename)));

    // Return the first valid tutorial (currently all file names are different)
    return validTutorials.find((tutorial: ITutorialObject) => !!tutorial);
};

// createResourceLink : creates a CommandLink to open a resource file
const createResourceLink: any = (relativeHref: string, tutorialDirectory: string, linkContents: any) => {
    const filePath: string = path.join(tutorialDirectory, relativeHref);
    return (
        <CommandLink
          linkContents={linkContents}
          commandName={ExtensionCommands.OPEN_RESOURCE_FILE}
          commandData={[filePath]}
        />
    );
};

const isDarkTheme: any = (): boolean => {
    const body: any = document.getElementsByTagName('body')[0];
    return body.className.includes('vscode-dark');
};

// transform : a function to modify the html before it is printed onto the screen
// * modifies the image src for the extension
// * modifies the relative file linking to link to other tutorials
const transform: any = (node: any, index: any, tutorialDirectory: string, tutorialData: any) => {
    // Wrapper so we always pass the imageLocation through
    const transformWrapper: any = (node2: any, index2: any) => {
        return transform(node2, index2, tutorialDirectory, tutorialData);
    };

    const { type, name: tag, attribs, children } = node;

    if (type === 'tag') {

        // Add syntax highlighting to codeblocks
        if (tag === 'pre' && children && children.length === 1 && children[0].name === 'code') {
            const [code] = children;
            if (code.attribs && code.attribs.class && code.children && code.children.length === 1 && code.children[0].type === 'text') {
                const language: string = code.attribs.class.replace('language-', '');
                const theme: string = isDarkTheme() ? tomorrowNight : tomorrow;
                return (
                    <SyntaxHighlighter language={language} style={theme} showLineNumbers>
                        {code.children[0].data}
                    </SyntaxHighlighter>
                );
            }
        }

        if (tag === 'img' && attribs && attribs.src) {
            // html needs the imageLocation to be up a directory
            const imageLocation: string = path.join('..', tutorialDirectory, attribs.src);
            attribs.src = imageLocation;
            attribs.style = 'max-width: 550px;';
            return convertNodeToElement(node, index, transformWrapper);
        }

        if (tag === 'a' && attribs && attribs.href) {
            if (attribs.href.startsWith('mailto')) {
                // demo-contract@0.0.2 comes through as a link, stop this
                return processNodes(node.children, transformWrapper);
            } else if (attribs.href.startsWith('vscode')) {
                return createVscodeLink(attribs.href, processNodes(node.children, transformWrapper));
            } else if (!isUrlAbsolute(attribs.href)) {
                if (path.basename(attribs.href).endsWith('.md')) {
                    const linkedTutorial: ITutorialObject = convertRelativePathToTutorial(attribs.href, tutorialData);
                    // if a linkedTutorial isn't found, fallback to the original a tag
                    if (linkedTutorial) {
                        return createTutorialLink(linkedTutorial, processNodes(node.children, transformWrapper));
                    }
                } else {
                    // Create link to an example file in the resources directory
                    return createResourceLink(attribs.href, tutorialDirectory, processNodes(node.children, transformWrapper));
                }
            }
        }
    }
};

// convertMarkdown : converts markdown to html to React
const convertMarkdown: any = (tutorial: ITutorialObject, tutorialData: any): string => {
    const markdown: any = tutorial.markdown || '';
    const html: any = unified()
        .use(parse)
        .use(remark2html)
        .processSync(markdown).contents;

    const tutorialDirectory: string = path.join('resources', 'tutorials', path.dirname(tutorial.file));

    const parsedHtml: any = ReactHtmlParser(html, { transform: (node, index) => transform(node, index, tutorialDirectory, tutorialData) });

    return parsedHtml;
};

const TutorialMarkdown: FunctionComponent<IProps> = ({ tutorial, tutorialData }) => {
    const parsedHtml: any = convertMarkdown(tutorial, tutorialData);

    const [linkToPreviousTutorial, linkToNextTutorial]: ReactElement[] = getPreviousAndNextTutorialLinks(tutorialData, tutorial.series, tutorial.title);

    return (
        <div className='tutorial-page'>
            <p>
                <strong>IBM Blockchain Platform</strong>
            </p>
            {linkToPreviousTutorial}
            <img className='ibp-icon' src={ibpIcon} alt='IBM Blockchain Platform' />
            <h2 className='tutorial-name'>{tutorial.title}</h2>
            <hr />
            <p>Estimated time: <code>{tutorial.length}</code></p>
            <div className='tutorial-content'>
                {parsedHtml}
            </div>
            <hr />
            {linkToNextTutorial}
        </div>
    );
};

export default TutorialMarkdown;
