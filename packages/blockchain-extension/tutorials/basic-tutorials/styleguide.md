<!-- Standard Header Start -->
**IBM Blockchain Platform**
<h3 align='left'>← <a href='./index.md'><b>Tutorials home</b></a>
<!-- Standard Header End -->

![alt text](./images/ibp.png "IBM Blockchain Platform")
## **Tutorial A0: Style guide for tutorials**

---

Estimated time: `10 minutes`

<!-- Standard Header End -->

This is a style guide to a style for the IBM Blockchain Platform tutorials. In this tutorial you will:
* Learn how to write and update tutorials that are both professional and consistently presented.
* Gain a set of standard markdown text templates you can copy and paste into tutorials.

It is recommended to view and edit these markdown files using VS Code, as this will allow you to preview the files in exactly the same rendering that users will see. Use examples from this file to copy and paste structural elements if you need to.
</details>


---
<details>
<summary><b>Guide for structure</b></summary>

* Use markdown wherever possible; drop to HTML only when necessary.
* Use a standard header, copied from above, which consists of:
    * The text "IBM Blockchain Platform" in simple **bold**.
    * Link back to the previous topic in the set using **h3** align left. Arrow is not hyperlinked.
    * The IBM Blockchain Platform motif
    * Title name in standard Markdown of the form: "Tutorial Xn.n: Name"
    * A horizontal line
    * An estimated time to completion (should be around 10 minutes).
    * An introduction and guide to the learning objectives of the tutorial, in bulleted points. Good learning objectives begin with an imperative verb that shows what a reader will do.
* The body text, which consists of:
    * A set of main sections, each collapsed into a twisty and separated by horizontal lines. These sections should be closed by default, as this gives the reader a visual indication of the topic structure. Subsections can be open or closed depending on context (use open="true" on the \<details\> tag to do this).
    * The last main section should include a Summary subsection which recaps what the student has done.
* Use a standard footer, copied from below, which consists of:
    * A link forward to the next topic in the set using **h3** align right. Arrow is not hyperlinked.


</details>

---
<details>
<summary><b>Guide for the text</b></summary>

![alt text](./images/bullet.png "[]") &nbsp;&nbsp;&nbsp;&nbsp; `A0.1`: &nbsp;&nbsp;&nbsp;&nbsp;
This is a mandatory task for the user.

* Mandatory instructions should look like the above, with the blue image and unique identifier in yellow. The identifier is of the form `Ab.c:`, where `A` is the tutorial set, `b` is the tutorial number within the set, and `c` is the sequential step number.
* The text next to the mandatory instructions should state the *bare minimum* the user needs to do. All background or explanatory text should be normal, unbulleted text.
* Each step should consist of one action only.
* Don't give the user a choice of what to do.
* Optional instructions go in normal, unbulleted text, and should be self-contained; later instructions should not be affected by whether the user completed any optional steps.
* General tone should be imperative: (e.g. "Open the file")
* Use first-person-plural voice to describe any narrative (e.g. "In the next section we will deploy a smart contract")
* Paragraphs should be short (1-3 sentences). Dense text gets skimmed by the reader.
* Refer to other tutorials using a hyperlink and include both the code number and title, for example, tutorial <a href="./a1.md">A1: Introduction</a>.
* Prefix any references to badges with a trophy icon of the relevant colour, for example: <img src='./images/badge_bronze.png'></img>IBM Blockchain Essentials
* Use *italics* when first introducing terms; don't overuse.
* Express navigation of menus using the form 'File' -> 'Save'.
* Avoid the quoting of keyboard shortcuts (Ctrl+S), as these vary from platform to platform.
* Avoid colloquial or complex language, as users may not have English as their first language. Also avoid emoticons and emojis, unless there is no other character available.
* Every task that includes a user action that changes the UI should follow with a screenshot:
    * All images go in the ./images directory - use relative links only.
    * File names should be in lower case and generally of the form "tutorial.step.png" (e.g. "a1.2.png"); use additional points and numbers where there are multiple images for a single step (e.g. "a1.2.1.png", "a1.2.2.png")
    * Reuse existing images where appropriate; use the file name to indicate all the places where the image is used (e.g. "a2.1-a3.1.png").
    * Use PNG as the file format.
    * Screen captures should be 1:1 size - VS Code resizes nicely based on the screen width.
    * Use red for highlighting within the image, 5px line width. Use rectangular box outlines rather than circles.
    * Use red Arial font for any text in the image
    * You only need to show the elements of the screen that have changed.
    * Use descriptive alt text.
    * Don't use colour as the sole differentiator of content.
    * Avoid visual effects such as shadows.
* How common terms should be referred to:
    * Hyperledger Fabric
    * VS Code (not VSCode, vscode etc.)
    * IBM Blockchain Platform (don't use 'IBP')
    * IBM Blockchain Platform developer tools (as a short form of 'IBM Blockchain Platform Extension for Visual Studio Code').
    * Use the <a href="https://code.visualstudio.com/docs/getstarted/userinterface#">correct terminology for VS Code elements</a>. For example, the "Smart Contracts", "Fabric Environments", "Fabric Gateways" and "Fabric Wallets" panels are known as *views*.
* Use the terms 'Hyperledger Fabric' and 'IBM Blockchain Platform' correctly. The tutorials are teaching users to build *Hyperledger Fabric* networks using *IBM Blockchain Platform* tools.
* Use `monospace` font *only* where the user has to type something (e.g. a parameter). Don't use monospace for quoting menu navigation or text on the screen; it makes the text too busy and difficult to read.
* Ensure copy and paste work correctly from the tutorials for commands and code-snippets.
* When entire commands are needed, these should be in a box-out.
   ```         
       peer chaincode deploy
   ```
* Use syntax highlighting when showing code:
```typescript
    public async doStuff(ctx: Context): Promise<void> {
        // blah
    }
```

> <br>
   > Use a side box like this to direct interested users to more information. <a href="https://www.ibm.com/blockchain/platform">https://www.ibm.com/blockchain/platform</a>
   > <br>&nbsp;

Normal explanatory text is written as standard markdown; avoid the use of bullet points unless you are producing a list of things. Check for visual appeal: don't make paragraphs too dense.

<br><h3 align='left'>Summary</h3>

This is an example of a Summary section that should conclude the tutorial, recapping what the student has learned and teasing the next tutorial in the series.

The summary should be part of the last major section of each tutorial, and introduced in **h3** align-left subsection style.

This subsection style can also be used to break sections apart where a twisty section is overkill.

</details>

<!-- Standard Footer Start -->

---

<h3 align='right'> → <a href='./a1.md'><b>A1: Introduction</b></h3></a>
<!-- Standard Footer End -->