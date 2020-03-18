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

(async() => {
    const fs = require('fs');
    const path = require('path');
    const child_process = require('child_process');
    
    let dirPath = path.join('.','packages');
    let packages = fs.readdirSync(dirPath);
    packages = packages.filter((_package) => {
        return _package !== '.DS_Store'
    });

    let failBuild = false;
    for(const _package of packages){

        /* 
            For each package.json, we need to remove any ibm-blockchain-*, otherwise production audit will fail/
            E.g.
                ERR! code ELOCKVERIFY
                npm ERR! Errors were found in your package-lock.json, run  npm install  to fix them.
                npm ERR!     Missing: ibm-blockchain-platform-common@^1.0.24
        */

        let packagePath = path.join(dirPath, _package);
        let packageJsonPath = path.join(packagePath, 'package.json')
        let originalPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
        
        let _packageJson = originalPackageJson;

        // Remove our monorepo packages
        _packageJson = _packageJson.replace(/"ibm-blockchain-(.*?)": (.*?),/gm, '')

        // Update package.json
        fs.writeFileSync(packageJsonPath, _packageJson);

        try{
            // Run an audit for package (only dependencies, not devDependencies)
            child_process.execSync('npm audit --production', {cwd: packagePath});
            console.log('No dependencies need updating for',packagePath);
        } catch(err){
            // It caught some audit problems.
            console.log('Dependencies need fixing for',packagePath, err.stdout.toString())
            failBuild = true;
            // Give a chance for Azure to log out the stdout (it will close prematurely otherwise).
            await new Promise((resolve) => setTimeout(resolve, 10000));
        } finally {
            // Write the package.json back to it's original state
            fs.writeFileSync(packageJsonPath, originalPackageJson);
        }


    }

    if(failBuild){
        // Cause Azure to fail
        // throw new Error('Vulnerabilities found - please update dependencies!')
        //

        // Don't cause Azure to fail
        console.log('Vulnerabilities found - please update dependencies!')
    }
})()