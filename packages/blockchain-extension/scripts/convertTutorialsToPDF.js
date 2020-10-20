#!/usr/bin/env node

const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const prettyMdPdf = require('pretty-markdown-pdf');

const readdirAsync = util.promisify(fs.readdir);
const exec = util.promisify(require('child_process').exec);

const TUTORIALS_DIR = path.join(__dirname, '..', 'resources', 'tutorials');
const TUTORIALS_JSON = path.join(TUTORIALS_DIR, 'tutorials.json');
const NEW_TUTORIALS_DIR = path.join(TUTORIALS_DIR, 'new-tutorials');
const TUTORIALS_TEMP_DIR = path.join(__dirname, '..', 'temp_tutorials');
const PDF_DIR = 'pdf';

// Write out the config for each directory to control the output dir
const CONFIG = {
  type: [
      "pdf"
  ],
  styles: [],
  stylesRelativePathFile: false,
  includeDefaultStyles: true,
  highlight: true,
  highlightStyle: "",
  breaks: false,
  executablePath: "",
  scale: 1,
  orientation: "portrait",
  pageRanges: "",
  format: "A4",
  width: "",
  height: "",
  margin: {
      top: "1.5cm",
      bottom: "1cm",
      right: "1cm",
      left: "1cm"
  },
  quality: 100,
}

function isValidFile(file) {
  return (path.extname(file) === '.md' && file !== 'index.md' && file !== 'styleguide.md');
}

function generateHeader(title, time) {
  const header = [
    '**IBM Blockchain Platform**',
    '<img src="./images/ibp.png" alt="IBM Blockchain Platform"></img>',
    `## **Tutorial ${title}**`,
    '---',
    `Estimated time: \`${time}\``,
  ];
  return `${header.join('\n\n')}\n\n`;
}

function generateFooter(nextTutorial) {
  if (!nextTutorial) {
    return '';
  }

  return `\n\n${[
    '---',
    `<h3 align='right'><b>→ Next: ${nextTutorial}</b></h3>`,
  ].join('\n\n')}`;
}

// Gets the information for a tutorial from the tutorials.json
// Also adds the title of the next tutorial
function getMetadataFromTutorialsJSON(fileName, dir, tutorialsJson) {
  const { tutorials } = tutorialsJson.find(({ tutorialFolder }) => tutorialFolder === dir);
  const tutorialIndex = tutorials.findIndex(({ file }) => file.endsWith(path.join(dir, fileName)));
  return {
    ...tutorials[tutorialIndex],
    nextTutorial: (tutorialIndex + 1 < tutorials.length) ? tutorials[tutorialIndex + 1].title : '',
  };
}

async function addHeaderAndFooterToFile(file, dir, tutorialsJSON) {
  if (isValidFile(file)) {
    const { title, length, nextTutorial } = getMetadataFromTutorialsJSON(file, dir, tutorialsJSON);
    const header = generateHeader(title, length);
    const footer = generateFooter(nextTutorial);

    const fullPath = path.join(TUTORIALS_TEMP_DIR, dir, file);
    const contents = await fs.readFile(fullPath, 'utf8');

    const newMarkdown = header.concat(contents, footer);
    await fs.writeFile(fullPath, newMarkdown);
  }
}

async function convertToPDF(file, dir, configFilePath) {
  if (isValidFile(file)) {
    const markdownFilePath = path.join(TUTORIALS_TEMP_DIR, dir, file);
    return prettyMdPdf.convertMd({ markdownFilePath, configFilePath });
  }
}

async function main() {
  // Load in tutorials.json
  const tutorialsJSON = await fs.readJson(TUTORIALS_JSON);

  // Copy tutorials to temp directory
  await fs.ensureDir(TUTORIALS_TEMP_DIR);
  await fs.copy(NEW_TUTORIALS_DIR, TUTORIALS_TEMP_DIR);

  const tutorialDirectories = (await readdirAsync(TUTORIALS_TEMP_DIR)).filter(name => name !== '.DS_Store');
  await Promise.all(tutorialDirectories.map(async dir => {
    const tutorials = await readdirAsync(path.join(TUTORIALS_TEMP_DIR, dir));

    // Add header to each file
    await Promise.all(tutorials.map(file => addHeaderAndFooterToFile(file, dir, tutorialsJSON)));

    // Remove old pdfs from temp directory
    await fs.remove(path.join(TUTORIALS_TEMP_DIR, dir, PDF_DIR));

    // Create config file for this set of tutorials
    const configFilePath = path.join(TUTORIALS_TEMP_DIR, dir, 'config.json');
    const outputDirectory = path.join(TUTORIALS_TEMP_DIR, dir, PDF_DIR);
    await fs.ensureDir(outputDirectory);
    await fs.writeJSON(configFilePath, { ...CONFIG, outputDirectory });

    // Convert tutorials to PDFs
    await Promise.all(tutorials.map(file => convertToPDF(file, dir, configFilePath)));

    // Overwrite old tutorials
    const finalDir = path.join(NEW_TUTORIALS_DIR, dir, PDF_DIR);
    await fs.remove(finalDir);
    await fs.move(outputDirectory, finalDir);
  }));

  // Cleanup
  await exec(`rm -rf ${TUTORIALS_TEMP_DIR}`);
}

main().catch(err => console.error(`Error creating PDFs: \n\n${err}`));
