
// copywrite 2023 Richard R. Lyman

const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground, setOutsideStroke } = require("./tagBatchPlay.js");
const { analyzeRectangles, addLayer } = require("./tagAddLayer.js");

let gSettings = {};
let stopTag = false;

restorePersistentData();
gSettings.charsPerFace = 10;  // not currently adjustable

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("vSlider").value = (-50 / 3) * gSettings.vertDisplacement + (50 * 3.8 / 3);
document.getElementById("fSlider").value = (50 / .8) * gSettings.fontSize + (-0.2 * 50 / 0.8);

let dialogs = new Array();

document.getElementById("btnOne").addEventListener("click", () => {
    tagSingleFile();
});
document.getElementById("btnMany").addEventListener("click", () => {
    tagMultiFiles();
});
document.getElementById("btnHelp").addEventListener("click", () => {
    dialogs[0].uxpShowModal();
});
document.getElementById("merge").addEventListener("change", evt => {
    gSettings.merge = evt.target.checked;
    localStorage.setItem("merge", gSettings.merge.toString());
    tagSingleFile();
});
document.getElementById("backStroke").addEventListener("change", evt => {
    gSettings.backStroke = evt.target.checked;
    localStorage.setItem("backStroke", gSettings.backStroke.toString());
    tagSingleFile();
});
document.getElementById("btnForeground").addEventListener("click", evt => {
    setForeground();
    localStorage.setItem("foreColor", gSettings.foreColor.rgb.hexValue);
    tagSingleFile();
});
document.getElementById("btnBackground").addEventListener("click", evt => {
    setBackground();
    localStorage.setItem("backColor", gSettings.backColor.rgb.hexValue);
    tagSingleFile();
});
document.getElementById("btnStop").addEventListener("click", evt => {
    enableButtons();        // this might cure lack up update when moving panel during facetags
    stopTag = true;
});
document.getElementById("vSlider").addEventListener("click", evt => {
    gSettings.vertDisplacement = (evt.target.value - (50 * 3.8 / 3)) / (-50 / 3);
    localStorage.setItem("vertDisplacement", gSettings.vertDisplacement);
    tagSingleFile();
});
document.getElementById("fSlider").addEventListener("click", evt => {
    gSettings.fontSize = (evt.target.value - (-0.2 * 50 / 0.8)) / (50 / .8);
    localStorage.setItem("fontSize", gSettings.fontSize);
    tagSingleFile();
});

let dontAsk = false;
/**
 * Opens up a file dialog box which returns a list of files to process
 * Annotates each file with the face tag labels for each person found in the file metadata * 
 */
async function tagSingleFile() {

    const app = require('photoshop').app;
    const { executeAsModal } = require("photoshop").core;


    if (app.documents.length == 0) {
        alert("No file is loaded. In PhotoShop Classic, load a file before running the script!");

    } else {

        let persons = readPersonsFromMetadata(app.activeDocument.path);
        await faceTagTheImage(persons);
    }


};
/**
 * Opens up a file dialog box which returns a list of files to process
 * Annotates each file with the face tag labels for each person found in the file metadata * 
 */
async function tagMultiFiles() {

    const fs = require('uxp').storage.localFileSystem;
    const app = require('photoshop').app;
    const { executeAsModal } = require("photoshop").core;
    disableButtons();

    // Put up a dialog box, and get file(s) to face tag.

    const files = await fs.getFileForOpening({ allowMultiple: true });

    dontAsk = false; // puts up only one alert for missing metadata when loading a bunch of files

    for (let i = 0; i < files.length; i++) {
        await executeAsModal(() => app.open(files[i]), { "commandName": "Opening a File" });
        let persons = readPersonsFromMetadata(app.activeDocument.path);
        await faceTagTheImage(persons);
        if (stopTag)
            break;
    }

    enableButtons();
};

/**
 *  create face labels for each person rectangle found in the document metadata
 * @param {[{personName, x, y, w, h}]} persons 
 * @returns 
 */
async function faceTagTheImage(persons) {

    const core = require('photoshop').core;
    const app = require('photoshop').app;
    const actn = require('photoshop').action;
    const constants = require("photoshop").constants;

    let gDoc = app.activeDocument;

    persons.sort((a, b) => b.name.toUpperCase().localeCompare(a.name.toUpperCase()));

    if ((persons != undefined) && (persons.length <= 0)) {
        const fname = app.activeDocument.path;
        const txt1 = "No face rectangles were found in the metadata of file  \'" + fname + "\'\.   ";
        const txt2 = "Identify Faces in Lightroom Classic and save the metadata of the image file to the disk by pressing Ctrl+S (Windows) or Command+S (Mac OS).  ";
        const txt3 = "It is recommended to facetag a copy of the original file to avoid accidentally saving over the original!  ";
        if (!dontAsk) alert(txt1 + txt2 + txt3);
        dontAsk = true;
        return;
    }

    //  find a common face rectangle size that doesn't intersect the other face rectangles too much, and move the rectangle below the chin

    let bestRect = analyzeRectangles(persons, gSettings.vertDisplacement);

    // Remove the old FaceTags Group

    let faceTagLayer = gDoc.layers.getByName("FaceTags");
    while (faceTagLayer != null) {

        if (faceTagLayer.layers != null) {
            let n = faceTagLayer.layers.length;
            for (let i = 0; i < n; i++) {
                if (stopTag)
                    break;
                await require('photoshop').core.executeAsModal(() => faceTagLayer.layers[0].delete(), { "commandName": "Deleting Layer" }); // remove old Group
            }
        }
        await require('photoshop').core.executeAsModal(() => faceTagLayer.delete(), { "commandName": "Tagging Faces" }); // remove old Group
        faceTagLayer = gDoc.layers.getByName("FaceTags");
    }

    // Put all layers under a group layer, "FaceTags"

    let faceTagsGroup = await require('photoshop').core.executeAsModal(() => { return gDoc.createLayerGroup({ name: "FaceTags" }) });

    // For each person in the picture, make a text layer containing the persons's name on their chest in a TextItem.

    for (let i = 0; i < persons.length; i++) {

        if (stopTag)
            break;
        await addLayer(gSettings, persons[i], bestRect);
    }

    // squash all the artlayers into one "FaceTags" layer

    if (gSettings.merge)
        await require('photoshop').core.executeAsModal(() => { return faceTagsGroup.merge() }, { commandName: "AddingLayer" });

    // apply backdrop effects

    if (gSettings.backStroke)
        await setOutsideStroke(gSettings);   // add background around the text

};

// load  persistent data

function restorePersistentData() {
    //localStorage.clear();
    gSettings.vertDisplacement = localStorage.getItem("vertDisplacement") || .8;
    gSettings.merge = (localStorage.getItem("merge") || "true") == "true";
    gSettings.backStroke = (localStorage.getItem("backStroke") || "true") == "true";
    gSettings.fontSize = localStorage.getItem("fontSize") || 1.0;

    // SolidColors are stored as a hexValue string.
    const SolidColor = require("photoshop").app.SolidColor;
    gSettings.foreColor = new SolidColor();
    gSettings.foreColor.rgb.hexValue = localStorage.getItem("foreColor") || "0xffffff";
    gSettings.backColor = new SolidColor();
    gSettings.backColor.rgb.hexValue = localStorage.getItem("backColor") || "0x0000ff";
}

function disableButtons() {
    document.getElementById("btnStop").removeAttribute("disabled");
    document.getElementById("btnMany").setAttribute("disabled", "true");
    document.getElementById("btnOne").setAttribute("disabled", "true");
    document.getElementById("merge").setAttribute("disabled", "true");
    document.getElementById("backStroke").setAttribute("disabled", "true");
    document.getElementById("btnHelp").setAttribute("disabled", "true");
    document.getElementById("vSlider").setAttribute("disabled", "true");
    document.getElementById("fSlider").setAttribute("disabled", "true");
    document.getElementById("btnForeground").setAttribute("disabled", "true");
    document.getElementById("btnBackground").setAttribute("disabled", "true");
    stopTag = false;
}

function enableButtons() {
    document.getElementById("btnStop").setAttribute("disabled", "true");
    document.getElementById("btnMany").removeAttribute("disabled");
    document.getElementById("btnOne").removeAttribute("disabled");
    document.getElementById("merge").removeAttribute("disabled");
    document.getElementById("backStroke").removeAttribute("disabled");
    document.getElementById("btnHelp").removeAttribute("disabled");
    document.getElementById("vSlider").removeAttribute("disabled");
    document.getElementById("fSlider").removeAttribute("disabled");
    document.getElementById("btnForeground").removeAttribute("disabled");
    document.getElementById("btnBackground").removeAttribute("disabled");
    stopTag = false;
}

makeHelpDialogs();


