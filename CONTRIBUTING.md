# So you want to contribute to the IBM Blockchain VS Code Extension

Detailed below are various instructions for getting set up with the Ibm Blockchain VS Code Extension. I've also included some tips for running the unit tests, making changes to the React app, and getting past our builds so that the fabulous PRs you deliver can be merged in that much easier. Enjoy!


## Setting up to develop
1. Go to the IBM Blockchain repository located [here]( https://github.com/IBM-Blockchain/blockchain-vscode-extension).
2. Fork this repository (by clicking the fork button on the top right of the page).
3. Clone the fork that you made to your local machine.
4. `cd` into the cloned repository in terminal, and run the following three commands:
    - `npm install -g lerna # This installs lerna, which can install dependencies across multiple packages`
    - `lerna bootstrap # This installs the packages dependencies`
    - `lerna run compile`
4. Open `blockchain-extension-.code-workspace` in VS Code.
5. To launch the development version of the extension, open the debug panel (click on the bug icon in the left sidebar), make sure the value in the dropdown at the top is "Extension", and then click the play button.
6. Follow the instructions provided on the Pre-requisites page that appears to finish getting set up

_Note: If you have grpc errors when you run the extension do a `lerna clean`, then `lerna bootstrap` and `lerna run compile`_

_Note: See [this gist](https://gist.github.com/Chaser324/ce0505fbed06b947d962) for help with setting up a forked repository_


## Picking up an issue
1. Make sure to assign the issue to yourself on GitHub! You should also move your issue to the appropriate column on the ZenHub board, probably the In Progress column
2. Next you need to create a new branch from master and check it out so that you can start to make the changes. This is the flow that I find the easiest, but feel free to do it the way that you are most comfortable with.
    - Assuming that your master branch is up to date, go to __your fork__ of the extension repository and create a new branch for the issue that you're picking up. __You should be opening a new branch for every issue.__
    - Do `git fetch` in your terminal to see the new branch that you have created.
    - Next do `git checkout -b <branch-name> origin/<branch-name>`. This will create a branch on your local machine and sync it up with the remote branch on GitHub at the same time.
3. After checking out a new branch, you may need to run `lerna run compile` to build the UI and the extension again.
4. Once that's done and you're able to launch the extension as you would expect, you can start making your changes.


## Running the unit tests
There are several packages, each with their own unit tests. To run all the unit tests apart from the extension ones run `lerna run unit`. This will also check coverage. If you want to debug the unit tests then in the debug panel choose `Unit tests` for the package you want to test and click play.

To run the extension unit tests
1. In the debug panel, change the value in the dropdown from "Extension" to "Unit Tests", and then click play. The output from the tests will appear in the VS Code debug console when the Unit Tests output is selected.
2. You can check the code coverage by navigating to the coverage directory in the repository, and opening the `index.html` file that you find there. This file is regenerated every time you run the unit tests.
3. Changing "Unit Tests" to "Debug Unit Tests" will let you... debug your unit tests. Be aware that running the unit tests in this way will not generate a coverage report.
4. The unit tests have a couple of fun quirks:
    - Occasionally the unit tests won't run first time, and you might have to try 3 or 4 times to get them going. If you put a breakpoint at the beginning of the `index.ts` file (in the tests directory), and just continue after the code stops there, the unit tests should run without any further issues.
    - If you are seeing strange behaviour such as incorrect coverage figures or tests for a non-existent file, running `lerna run compile` in terminal will do some clean up for you and hopefully resolve your problems.


## Developing the React app
You may have noticed a directory inside `packages` called `blockchain-ui`. While the bulk of the extension lives in `blockchain-extension`, the ui directory contains the React app that is used to render several of the webviews you see within the extension. Getting set up and developing for this app is a little bit different compared to the rest of the extension.

### Development
1. In order to see any changes that are made to the React app, you'll first need to run `npm lerna compile` to build them for the extension. Once that's finished, launch the extension as you would normally
2. Building the app takes a while, which is a pain if you're only making cosmetic changes. Alternatively, you can run `npm run start` in the `blockchain-ui` directory, which will launch a development version of the app in your default browser.
    - The app opens at `http://localhost:3000/`. To navigate to the page you want to work on, you'll need to update this path, e.g. to `http://localhost:3000/#/transaction/create`. Remember the hash between the port number and the rest of the path!
    - Don't forget that while the app happily renders, any information that comes from the extension (smart contracts, user settings etc) will be missing. Clicking anything that tries to access that missing data, or tries to make a call to the extension, will cause the app to error.

### Tests
1. We use [Jest](https://jestjs.io/docs/en/getting-started.html) for unit testing the React app. To run the Jest tests, run `npm run unit` in the `blockchain-ui` directory.
2. [Snapshot tests](https://jestjs.io/docs/en/snapshot-testing) are used to test that the html that makes up the react components is rendered as expected. If a snapshot test is failing because the snapshot is out of date, run `npm run unit -- -u` to update that snapshot.
3. The code coverage is configured in the Jest settings (at the bottom of `blockchain-ui/package.json`) so that the tests will fail if the coverage is below 100%. A summary of the coverage is output in the terminal when the tests have finished running, and more detailed coverage reports can be found in `blockchain-ui/coverage/lcov-report/index.html`.
4. [Cypress](https://docs.cypress.io/guides/overview/why-cypress.html#In-a-nutshell) is used for end to end testing in the React app. Running `npm run cypress` in the `blockchain-ui` directory will launch Cypress and allow you to run the various test specs.


## Committing your changes (and pushing them onto GitHub)
1. Stage your changed files for commit by either doing `git add .` in terminal (to add all of your changes at once), or by using the Git options in VS Code.
2. Commit the changes that you've made by doing `git commit -s -m "commit message"` in terminal.
    - `-s` signs your commit, which is important for contributing to the extension. One of the checks that runs against our PRs is that all commits have been signed. If you forget to sign your commit then you'll have to manually go through the commit log and add signatures yourself.
    - `-m` adds a message to your commit. In our team, we just add a brief sentence to describe what we've done, and how it can be tested (if relevant)
3. When everything has been committed and signed, you can do `git push` in terminal to push your changes to the branch on your fork on GitHub. You don't have to do this every time you commit, but you will have to when you are ready to merge your changes into master.



## Keeping in sync with master
1. Keep an eye on how many commits are going into the master branch while you're working on your issue. If you fall too far behind, you'll find yourself in merge hell when you try to catch up.
2. __Assuming that you've properly configured your fork and added an 'upstream' repo that points to the original extension repository,__ in terminal, do `git fetch upstream` to fetch any changes that have been made.
3. Generally, __the extension team doesn't like multiple commits__, so to catch up you'll need to do a rebase rather than a merge.
4. You can only do a rebase if your branch is "clean", i.e. you have no uncommitted changes.
    - If you're happy with the change set that you've currently got, you can just commit the changes that you've made (see the "Committing your changes" section).
    - If you're not ready to commit, you can do a `git stash` to temporarily get rid of your changes. You'll be able to get them back in a minute so don't worry.
5. When your branch is clean do `git rebase upstream/master`. This command undoes any of your commits that aren't on master, adds the commits that you're missing, and then adds your stuff on top at the end.
6. You may run into merge conflicts during this process. To overcome these, view the conflicts in VS Code and accept the appropriate changes were necessary. Save these changes and stage the files, and then in terminal do `git rebase --continue` to proceed with the rebase.
7. Repeat step 6 as many times as is needed - you may run into merge conflicts more than once during the rebase process.
7. Once the rebase is finished, you can do `git stash apply` to get back any changes that you have stashed. Again, there may be merge conflicts to deal with, so use VS Code to resolve them.
8. Congratulations, after doing all of that you're now caught up with master.


## Opening a pull request
1. __IMPORTANT:__ your PR will __NOT__ be merged unless all of the tests are passing and you've written/updated appropriate tests to cover your code changes.
2. Follow the steps in the "Committing your changes" section to get your change set up onto your remote repository.
3. Go to the [extension repository on GitHub](https://github.com/IBM-Blockchain/blockchain-vscode-extension), where it'll probably show your recently pushed branch with a big green "open a pull request" button at the top. Click or that, or if it doesn't show up, go to the Pull Requests tab and click the "new pull request" button you see there.
4. The title text box will autofill with something based on your branch name or commit message. Give it a more appropriate title if you need do.
5. In the description, it's good practice to say which issue number that your PR is for. If the issue will be closed by your changes, then say `Closes #<issue-number>`. GitHub will then automatically close the issue for you when your PR gets merged.
6. You can request a reviewer using the dropdown on the right-hand side. GitHub will suggest reviewers to you, based on who else has contributed to teh area of code that you've been working on. Alternatively, you can just ask someone in the team to review your PR for you. Either way you'll want to __tell/ping your reviewer to let them know your PR is open__, as it's easy to miss the email notification they'll receive if you request them.
7. Once you're happy, click "create pull request". Your PR is now open!

## Passing the build and getting your changes in
1. To pass the DCO check, all your commits must be signed off using the `-s` flag on your merge commits.
2. The Azure build will not pass unless all of the tests are passing and code coverage is at 100%. If you've forgotten to fix a test, you'll need to amend your commit and push your branch onto GitHub again - this will trigger a fresh build.
3. If the build does fail, you can click on the details button next to the failing job to see more information about what caused the failure. You can also rerun failed jobs from here, in the event that your build just timed out or failed because of some other reason beyond your control.
    - If the build complains about and `npm audit` failure, it means that one of the project's dependencies has a vulnerability and needs to be upgraded. Running the `lerna exec audit` command will update these dependencies. You should then commit the `package.json` and `package.lock.json`, restarting the build with the updated dependencies.
4. Your PR also needs someone to approve it before it can be merged. If you get your PR approved and you then push some changes to the same branch, the review will be marked as "stale" and you'll have to get your new change set approved.
5. Once the build passes and your reviewer is happy, they will approve your PR. You can then hit the big green "Squash and merge" button at the bottom of your PR to finally merge your changes into master.


## Useful Git commands:
There are many different cheat sheets for GitHub available, such as [this one](https://github.github.com/training-kit/downloads/github-git-cheat-sheet.pdf). Below are a few handy commands that haven't already been mentioned/explained in this guide.
- `git status` will show you what branch you're currently working on, how many commits ahead and behind of the remote branch you are, and how many uncommitted files you currently have.
- `git log` shows the commit log of the current branch. Useful to check that all your commits are signed before opening a PR.
- `git commit --amend` is useful for making changes based on a review. Again, the team tries to avoid multiple commits where possible, so amending a previous commit instead of adding a new one is pretty common.
- `git stash` temporarily removes all your changes from your active branch and stores them, which is handy when you're rebasing or if you just want to remind yourself what the code was like before you started.
- `git stash apply` reapplies the most recently stashed change set. To apply a specific change set, use `git stash apply <ID of the change set you want to apply>`.
- `git stash list` shows you IDs and descriptions of all the change sets that you have stashed.
