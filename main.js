
// copywrite 2023 Richard R. Lyman

const {readPersonsFromMetadata} = require("./tagMetadata.js");
const {makeHelpDialogs} = require("./tagHelp.js");
const {setForeground, setBackground, setOutsideStroke} = require("./tagBatchPlay.js");
const { analyzeRectangles, addLayer} = require("./tagAddLayer.js");

var gSettings = {};
var gDoc;

restorePersistentData();
gSettings.charsPerFace = 10;  // not currently adjustable

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("vSlider").value = (-50 / 3) * gSettings.vertDisplacement + (50 * 3.8 / 3);
document.getElementById("fSlider").value = (50 / .8) * gSettings.fontSize + (-0.2 * 50 / 0.8);

const { entrypoints } = require("uxp");

entrypoints.setup({
    panels: {
        vanilla: {
            show() { },
        }
    }
});
let dialogs = new Array();
document.getElementById("btnOne").addEventListener("click", () => tagSingleFile());
document.getElementById("btnMany").addEventListener("click", () => tagMultiFiles());
document.getElementById("btnHelp").addEventListener("click", () => { dialogs[0].uxpShowModal() });
document.getElementById("merge").addEventListener("change", evt => {
    gSettings.merge = evt.target.checked;
    localStorage.setItem("merge", gSettings.merge);
    tagSingleFile();
});
document.getElementById("backStroke").addEventListener("change", evt => {
    gSettings.backStroke = evt.target.checked;
    localStorage.setItem("backStroke", gSettings.backStroke);
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
async function tagSingleFile() {
    const app = require('photoshop').app;
    const { executeAsModal } = require("photoshop").core;

    if (app.documents.length == 0) {
        alert("No file is loaded. In PhotoShop Classic, load a file before running the script!");
        return;
    }

    let persons = await readPersonsFromMetadata(app.activeDocument.path);
    await faceTagTheImage(persons);

};
async function tagMultiFiles() {
    const fs = require('uxp').storage.localFileSystem;
    const app = require('photoshop').app;
    const { executeAsModal } = require("photoshop").core;

    // Put up a dialog box, and get file(s) to face tag.

    const files = await fs.getFileForOpening({ allowMultiple: true });
    dontAsk = false; // puts up only one alert for missing metadata when loading a bunch of files
    for (let i = 0; i < files.length; i++) {
        await executeAsModal(() => app.open(files[i]), { "commandName": "Opening a File" });
        let persons = await readPersonsFromMetadata(app.activeDocument.path);
        await faceTagTheImage(persons);
    }
};

// create face labels for each person rectangle found in the document metadata

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
        if (!dontAsk) alert(txt1 + txt2 + txt3 );
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
    gSettings.vertDisplacement = localStorage.getItem("vertDisplacement") || .8;
    gSettings.merge = localStorage.getItem("merge") || true;
    gSettings.backStroke = localStorage.getItem("backStroke") || true;
    gSettings.fontSize = localStorage.getItem("fontSize") || 1.0;

    // SolidColors are stored as a hexValue string.
    const SolidColor = require("photoshop").app.SolidColor;
    gSettings.foreColor = new SolidColor();
    gSettings.foreColor.rgb.hexValue = localStorage.getItem("foreColor") || "0xffffff";
    gSettings.backColor = new SolidColor();
    gSettings.backColor.rgb.hexValue = localStorage.getItem("backColor") || "0x0000ff";
}
makeHelpDialogs();



