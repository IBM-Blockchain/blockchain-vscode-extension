/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
'use strict';

// This script is used to check that the RELEASE-NOTES.md (the latest releases notes) has been updated.
// It will simply check the version and date in the file has been updated appropriately.

const fs = require('fs');
const dateFormat = require('dateformat');

console.log('Reading release notes');
const releaseNotes = fs.readFileSync('./RELEASE-NOTES.md', 'utf8');
console.log('Read recent release notes:', releaseNotes);

console.log('Reading package.json')
const packageJson = JSON.parse(fs.readFileSync('./package.json'));

const includesVersion = releaseNotes.includes(`v${packageJson.version}`)
if(!includesVersion){
    throw new Error(`RELEASE-NOTES.md has not been updated with the latest release version: v${packageJson.version}`);
}

console.log('Getting todays date');
const now = new Date();
const todaysDate = dateFormat(now, "mmmm dS yyyy");
console.log('Todays date is:', todaysDate);

const includesDate = releaseNotes.includes(todaysDate);
if(!includesDate){
    throw new Error(`RELEASE-NOTES.md has not been updated with todays date: ${todaysDate}`);
}

console.log('Release notes contain the latest release version and todays date')
