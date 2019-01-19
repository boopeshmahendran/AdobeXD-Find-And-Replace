const { showFindAndReplaceDialog } = require("./dialogs");
const { Text } = require("scenegraph");

async function findAndReplace(selection, documentRoot) {
    const response = await showFindAndReplaceDialog();

    switch (response.which) {
        case 1: // Replace all was clicked
            console.log(response)
            const values = response.values;

            // Handle Match case
            if (!values.matchCase) {
                values.find = new RegExp(values.find, "ig");
            }

            // Handle Search scope
            switch (values.scope) {
                case "currentArtboard":
                    if (selection.focusedArtboard) {
                        replaceAll(selection.focusedArtboard, values.find, values.replace);
                    }
                    break;
                default: replaceAll(documentRoot, values.find, values.replace);
                    break;
            }

    }
}

function replaceAll(rootNode, findText, replaceText) {
    if (!rootNode.isContainer) return ;
    rootNode.children.forEach(node => {
        if (node instanceof Text) {
            console.log(node.text);
            if (node.name === node.text) {
                node.name = node.text = node.text.replace(findText, replaceText);
            } else {
                node.text = node.text.replace(findText, replaceText);
            }
        } else if (node.isContainer) {
            replaceAll(node, findText, replaceText);
        }
    })
}

module.exports.commands = {
    findAndReplace
}