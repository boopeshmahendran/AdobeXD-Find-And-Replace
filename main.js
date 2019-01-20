const { Text } = require("scenegraph");
const { error } = require("./lib/dialogs.js");

/**
 * Creates and show the find and replace dialog UI
 * 
 * @returns {Promise} Resolves to an object of form {which, values}. `which` indicates which button
 * was pressed. `values` is an object containing the values of the form.
 */
async function showFindAndReplaceDialog() {
    let buttons = [
        { label: "Cancel", variant: "primary" },
        { label: "Replace All", variant: "cta", type: "submit" }
    ];

    const dialog = document.createElement('dialog');
    dialog.innerHTML = `
<style>
    form {
        width: 360px;
    }
    .h1 {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
    .h1 img {
        width: 18px;
        height: 18px;
        flex: 0 0 18px;
        padding: 0;
        margin: 0;
    }
    img.plugin-icon {
        border-radius: 4px;
        overflow: hidden;
    }
    .container {
        zoverflow-x: hidden;
        overflow-y: auto;
        height: auto;
    }
</style>
<form method="dialog">
    <h1 class="h1">
        <span>Find And Replace</span>
        <img class="plugin-icon" src="x" />
    </h1>
    <hr />
    <div class="container">
                <label>
                    <span>Find</span>
                    <input type="text" id="find" placeholder="Find" />
                </label>
                <label>
                    <span>Replace</span>
                    <input type="text" id="replace" placeholder="Replace" />
                </label>
                <label class="row">
                    <span>Scope</span>
                    <select id="scope">
                        <option value="wholeDocument">Whole Document</option>
                        <option value="currentArtboard">Current Artboard</option>
                    </select>
                </label>
                <label class="row">
                    <input id="matchCase" type="checkbox" checked="true" />
                    <span>Match case</span>
                </label>
    </div>
    <footer>
        ${buttons.map(({label, type, variant} = {}, idx) => `<button id="btn${idx}" type="${type}" uxp-variant="${variant}">${label}</button>`).join('')}
    </footer>
</form>
    `;

    dialog.querySelector("#scope").selectedIndex = 0;

    // The "ok" and "cancel" button indices. OK buttons are "submit" or "cta" buttons. Cancel buttons are "reset" buttons.
    let okButtonIdx = -1;
    let cancelButtonIdx = -1;
    let clickedButtonIdx = -1;

    // Ensure that the form can submit when the user presses ENTER (we trigger the OK button here)
    const form = dialog.querySelector('form');
    form.onsubmit = () => dialog.close('ok');

    // Attach button event handlers and set ok and cancel indices
    buttons.forEach(({type, variant} = {}, idx) => {
        const button = dialog.querySelector(`#btn${idx}`);
        if (type === 'submit' || variant === 'cta') {
            okButtonIdx = idx;
        }
        if (type === 'reset') {
            cancelButtonIdx = idx;
        }
        button.onclick = e => {
            e.preventDefault();
            clickedButtonIdx = idx;
            dialog.close( idx === cancelButtonIdx ? 'reasonCanceled' : 'ok');
        }
    });

    try {
        document.appendChild(dialog);
        const response = await dialog.showModal();
        if (response === 'reasonCanceled') {
            // user hit ESC
            return {which: cancelButtonIdx, value: ''};
        } else {
            if (clickedButtonIdx === -1) {
                // user pressed ENTER, so no button was clicked!
                clickedButtonIdx = okButtonIdx; // may still be -1, but we tried
            }
            return {
                which: clickedButtonIdx,
                values: {
                    find: dialog.querySelector('#find').value || '',
                    replace: dialog.querySelector('#replace').value || '',
                    matchCase: dialog.querySelector('#matchCase').checked,
                    scope: dialog.querySelector('#scope').value
                }
            };
        }
    } catch(err) {
        // system refused the dialog
        return {which: cancelButtonIdx, value: ''};
    } finally {
        dialog.remove();
    }
}

/**
 * Recursively replaces all occurences of findText with replaceText in the entire scengraph tree
 * starting at rootNode
 * 
 * @param {!SceneNode} rootNode Root node of the scenegraph
 * @param {!RegExp} findText Regex Object for matching findText
 * @param {!string} replaceText Text to be replaced
 */
function replaceAll(rootNode, findText, replaceText) {
    if (!rootNode.isContainer) return 0;

    let noOfOccurences = 0;
    const replacer = function () {
        noOfOccurences++;
        return replaceText;
    }

    rootNode.children.forEach(node => {
        if (node instanceof Text) {
            if (node.name === node.text) {
                node.name = node.text = node.text.replace(findText, replacer);
            } else {
                node.text = node.text.replace(findText, replacer);
            }
        } else if (node.isContainer) {
            noOfOccurences += replaceAll(node, findText, replaceText);
        }
    });

    return noOfOccurences;
}

/**
 * Entry point for the plugin
 * 
 * @param {!Selection} selection
 * @param {!SceneNode} documentRoot
 */
async function findAndReplace(selection, documentRoot) {
    const response = await showFindAndReplaceDialog();

    if (response.which === 1) { // Replace all was clicked

        const values = response.values;

        // Handle errors
        if (values.find.trim() === "") {
            await error("Error", "Find field is empty");
            return;
        }
        else if (values.replace.trim() === "") {
            await error("Error", "Replace field is empty");
            return;
        }

        // Handle Match case
        if (values.matchCase) {
            values.find = new RegExp(values.find, "g");
        } else {
            values.find = new RegExp(values.find, "ig");
        }


        let noOfOccurences = 0;

        // Handle Search scope and replace
        switch (values.scope) {
            case "currentArtboard":
                if (selection.focusedArtboard) {
                    noOfOccurences = replaceAll(selection.focusedArtboard, values.find, values.replace);
                } else {
                    await error("Error", "No Focused artboard");
                }
                break;
            default:
                noOfOccurences = replaceAll(documentRoot, values.find, values.replace);
                break;
        }

        // Handle errors
        if (noOfOccurences === 0) {
            await error("Error", "No occurences of findText found");
        }
    }
}

module.exports.commands = {
    findAndReplace
}