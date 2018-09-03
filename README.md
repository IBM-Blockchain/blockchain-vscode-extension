# IBM Blockchain Extension for VSCode

Code, Discover and Test Fabric smart contracts


## Manual Build and Install

```
git clone https://github.ibm.com/IBM-Blockchain/fabric-vscode-extension.git
cd ../client
npm install
```

# Travis CI build
Developers no longer need a manual build, once you have pulled a request from your private Github repository. The build will be automatically performed by Travis.
A successful build will create an installable VSIX file on the build machine. 
The public release version number is defined in the Client package.json file. 

## Publish Release
Below are steps for publishing a release.
1. Go to https://github.ibm.com/IBM-Blockchain/fabric-vscode-extension
2. Click Releases tab
3. Click Draft a new release on the right
4. Type a Tag version in the Tag version field. e.g. v0.5.7.1
5. Type a Release title in the Release title field e.g v0.5.7.1
6. Provide a short description of this release under the Write tab
7. Uncheck the box for This is a pre-release at the end of this page
8. Click Publish release button to publish the VSIX file to the VSCode Marketplace

## Check the published release
1. Go to the VSCode Marketplace: https://marketplace.visualstudio.com/
2. Type Composer in the search field and hit return key or search button
3. This will bring you to https://marketplace.visualstudio.com/search?term=Composer&target=VSCode&category=All%20categories&sortBy=Relevance

## Install a new release
1. Open Visual Studio Code in your desktop
2. Open the Extensions by View-->Extensions or Ctrl(cmd)+Shift+x 
3. Search for Composer
4. The new published version is showing on the list
5. Click Install button to install it
6. Update button will be shown if you have already installed the same plugin before.


## License <a name="license"></a>
The source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.