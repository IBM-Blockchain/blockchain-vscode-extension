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

const fs = require('fs');

console.log("rewriting package json");

const packageJson = JSON.parse(fs.readFileSync('./package.json'));

if(packageJson.activationEvents.length > 1) {
  throw new Error('Activation events should be * when checked in');
}

packageJson.activationEvents = [];

packageJson.actualActivationEvents.onView.forEach((event) => {
  packageJson.activationEvents.push('onView:' + event);
});

packageJson.actualActivationEvents.onCommand.forEach((event) => {
  packageJson.activationEvents.push('onCommand:' + event);
});

const packageJsonString = JSON.stringify(packageJson, null, 4);

fs.writeFileSync('./package.json', packageJsonString, 'utf8');

console.log("finished rewriting package json");
