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

// NOTE: this file is also used by the engagement team so be careful when changing it

const fs = require('fs');
const process = require('process');

console.log('calling rewriting package json');

if (process.argv.includes('publish')) {
  const packageJson = JSON.parse(fs.readFileSync('./package.json'));

  packageJson.production = true;

  const packageJsonString = JSON.stringify(packageJson, null, 4);

  fs.writeFileSync('./package.json', packageJsonString, 'utf8');

  console.log('finished rewriting package json');

}