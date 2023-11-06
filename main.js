
// copywrite 2023 Richard R. Lyman
const { executeAsModal } = require("photoshop").core;
const { batchPlay } = require("photoshop").action;
const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground, setOutsideStroke, makeAPortrait, newDocumentFromHistory } = require("./tagBatchPlay.js");
const { analyzeRectangles, addLayer, displayDictionary } = require("./tagAddLayer.js");


/**
 * gSettings contains all the persistent preferences
* @type {
* gsettings {  
* vertDisplacement : number,
* backStroke : boolean,
* portraitMode : boolean,  
* fontSize  : number,
* foreColor: SolidColor,
* backColor SolidColor,
* charsPerFace : number,
* }}
*/
let gSettings = {};
let stopTag = false;

const labeledSuffix = "-labeled";

restorePersistentData();
gSettings.charsPerFace = 10;  // not currently adjustable

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("portraitMode").checked = gSettings.portraitMode ? 1 : 0;
document.getElementById("vSlider").value = (-50 / 3) * gSettings.vertDisplacement + (50 * 3.8 / 3);
document.getElementById("fSlider").value = (50 / .8) * gSettings.fontSize + (-0.2 * 50 / 0.8);

let dialogs = new Array();

document.getElementById("btnOne").addEventListener("click", () => {
    tagSingleFile();
});
document.getElementById("btnMany").addEventListener("click", () => {
    tagMultiFiles(null);
});
document.getElementById("btnBatch").addEventListener("click", () => {
    disableButtons();  // only enable the Cancel button        
    tagBatchFiles(null, null);
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
document.getElementById("portraitMode").addEventListener("change", evt => {
    gSettings.portraitMode = evt.target.checked;
    localStorage.setItem("portraitMode", gSettings.portraitMode.toString());
    tagSingleFile();
});
document.getElementById("btnForeground").addEventListener("click", evt => {
    setForeground();
    console.log(displayDictionary('gSettings foreColorX', gSettings));
    localStorage.setItem("foreColor", gSettings.foreColor.rgb.hexValue);
    console.log(displayDictionary('gSettings foreColor', gSettings));
    tagSingleFile();
});
document.getElementById("btnBackground").addEventListener("click", evt => {
    setBackground();
    localStorage.setItem("backColor", gSettings.backColor.rgb.hexValue);
    tagSingleFile();
});
document.getElementById("btnStop").addEventListener("click", evt => {
    console.log("stop button click");
    enableButtons();        // this might cure lockup  when moving panel during facetags
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
/**
 * 
 * @param {*} entry a UXP File entry for the disk file to be opened and tagged
 * 
 * @returns false if the file type is not on the list to be facetagged or there are no persons to facetag.
 */
async function openAndTagFileFromDisk(entry) {
    const app = require('photoshop').app;

    if (!entryTypeIsOK(entry)) // skip over unsupported photo file types
        return false;
    let persons = readPersonsFromMetadata(entry.nativePath);
    if ((persons.length > 0) && (!stopTag)) {
        await executeAsModal(() => app.open(entry), { "commandName": "Opening batched File" });
        let aDoc = app.activeDocument;
        if (aDoc != null) {
            await faceTagTheImage(persons);
        } else {
            await executeAsModal(() => aDoc.closeWithoutSaving(), { "commandName": "Closing" });
            await new Promise(r => setTimeout(r, 100));    // required to give time process Cancel Button               
            return false;
        }
    } else
        return false;
    await new Promise(r => setTimeout(r, 100));    // required to give time process Cancel Button  
    return true;
}

let dontAsk = false; // puts up only one alert for missing metadata when loading a bunch of files
/**
 * Refreshes the FaceTags for the currently open active document
 */
async function tagSingleFile() {

    const app = require('photoshop').app;
    let aDoc = app.activeDocument;

    if (app.documents.length == 0) {
        alert("No file is loaded. In PhotoShop Classic, load a file before running the script!");
    } else {
        let persons = readPersonsFromMetadata(aDoc.path);
        // await resetHistoryState(aDoc);  // why do I need this?
        await faceTagTheImage(persons);
    }
};

/**
 * Opens up a file dialog box which returns a list of files to process
 * Annotates each file with the face tag labels for each person found in the file metadata 
 * the photos remain loaded in Photoshop
 */
async function tagMultiFiles() {

    const fs = require('uxp').storage.localFileSystem;
    const app = require('photoshop').app;
    disableButtons();  // only enable the Cancel button

    // Put up a dialog box, and get a list of file(s) to face tag.

    const files = await fs.getFileForOpening({ allowMultiple: true });

    dontAsk = false; // puts up only one alert for missing metadata when loading a bunch of files

    for (let i = 0; i < files.length && (!stopTag); i++) {
        if (! await openAndTagFileFromDisk(files[i]))
            continue;
    }

    enableButtons();   // disable the Cancel button and enable the others
};
var labeledDirectory;
/**
 * Determine the suffix of the labeledDirectory folder by finding previous versions and adding 1 to the _n suffix of the folder name.
 */
/**
 * 
 * @param {*} ents List of files and folders of the top level folder 
 * @returns The name of the labeledDirectory top level folder
 */
function getFaceTagsTreeName(originalName, ents) {
    let iMax = 0;
    labeledDirectory = originalName + labeledSuffix;
    for (let i1 = 0; i1 < ents.length; i1++) {
        if (ents[i1].name.startsWith(labeledDirectory)) {
            let results = ents[i1].name.split("_");
            let x = Number(results[1])
            if (x > iMax) iMax = x;
        }
    }
    iMax++;
    let faceName = labeledDirectory + "_" + iMax.toString();
    return faceName;
}


/**
 * Opens up a folder dialog box to select top folder to process
 * Makes a new folder called FaceTaggedPhoto and builds a tree under it that duplicates
 * the source tree. Populates it with tagged photos of the originals.
 * 
 * Annotates each file with the face tag labels for each person found in the file metadata 
 * 
 * @param {*} originalPhotosFolder       Folder Entry that is navigating the folder tree with the original photos. null if is the initial call
 * @param {*} labeledDirectoryFolder     Folder Entry that is navigating the folder tree containing the results of the faceTagging.
 * @returns 
 */
async function tagBatchFiles(originalPhotosFolder, labeledDirectoryFolder) {
    const fs = require('uxp').storage.localFileSystem;
    const app = require('photoshop').app;
    let topRecursionLevel = false;
    let newFolder = null;

    dontAsk = true;

    // make the newFolder in the FaceTags Tree to hold tagged version of the files in the originalPhotosFolder

    if (originalPhotosFolder == null) {  // null is the initial call
        topRecursionLevel = true;
        originalPhotosFolder = await fs.getFolder();
        if (originalPhotosFolder != null) {  // null if user cancels dialog  
            // create the top level labeledDirectoryFolder
            const ents = await originalPhotosFolder.getEntries();
            newFolder = await originalPhotosFolder.createFolder(getFaceTagsTreeName(originalPhotosFolder.name, ents));
        }

    } else {

        // traverse the labeledDirectory folder with an folder names similar to the original folder tree
        newFolder = await labeledDirectoryFolder.createFolder(originalPhotosFolder.name + labeledSuffix);
    }

    // process all the files and folders in the originalPhotosFolder
    if (newFolder != null) {
        const entries = await originalPhotosFolder.getEntries();
        for (let i = 0; (i < entries.length) && (!stopTag); i++) {
            const entry = entries[i];;

            // recurse folders
            if (entry.isFolder && (!entry.name.startsWith(labeledDirectory)) && (!entry.name.startsWith("."))) {
                await tagBatchFiles(entry, newFolder);

            } else {

                ////////////////////     PAYLOAD START     /////////////////////      

                // Facetag the file                 
                if (! await openAndTagFileFromDisk(entry))
                    continue;

                // and save it
                let aDoc = app.activeDocument;
                await executeAsModal(() => aDoc.flatten(), { "commandName": "Flattening" });   // required to save png 
                // get rid of the old extension
                let fname = aDoc.name.replace(/\.[^/.]+$/, "") + labeledSuffix + '.jpg';
                let saveEntry = await newFolder.createFile(fname); // similar name as original but store on tagged tree.
                await executeAsModal(() => aDoc.saveAs.jpg(saveEntry), { "commandName": "Saving" });
                await executeAsModal(() => aDoc.closeWithoutSaving(), { "commandName": "Closing" });

                ////////////////////     PAYLOAD END     /////////////////////      

            }
        }

        // delete empty folders
        let ents = await newFolder.getEntries();
        if (ents.length == 0) {
            console.log("deleting " + newFolder.name);
            await newFolder.delete();
        }
    }

    if (topRecursionLevel) {
        console.log("topRecursionLevel");
        enableButtons();   // disable the Cancel button and enable the others 
    }
};

/**
 *  create face labels for each person rectangle found in the document metadata
 * @param {[{personName, x, y, w, h}]} persons 
 * @returns 
 */
async function faceTagTheImage(persons) {

    const core = require('photoshop').core;
    const app = require('photoshop').app;

    let aDoc = app.activeDocument;

    if ((persons != undefined) && (persons.length <= 0)) {
        const fname = app.activeDocument.path;
        const txt1 = "No face rectangles were found in the metadata of file  \'" + fname + "\'\.   ";
        const txt2 = "Identify Faces in Lightroom Classic and save the metadata of the image file to the disk by pressing Ctrl+S (Windows) or Command+S (Mac OS).  ";
        const txt3 = "It is recommended to facetag a copy of the original file to avoid accidentally saving over the original!  ";
        if (!dontAsk) alert(txt1 + txt2 + txt3);
        dontAsk = true;
        return;
    }

    persons.sort((a, b) => b.name.toUpperCase().localeCompare(a.name.toUpperCase()));

    // Remove the old FaceTags Group

    let faceTagLayer;
    while ((faceTagLayer = aDoc.layers.getByName("FaceTags")) != null) {

        if (faceTagLayer.layers != null) {
            let n = faceTagLayer.layers.length;
            for (let i = 0; i < n; i++) {
                await require('photoshop').core.executeAsModal(() => faceTagLayer.layers[0].delete(), { "commandName": "Deleting Layer" }); // remove old Group
            }
        }
        await require('photoshop').core.executeAsModal(() => faceTagLayer.delete(), { "commandName": "Tagging Faces" }); // remove old Group
    }

    // start with clean document  

    await executeAsModal(() => aDoc.flatten(), { "commandName": "Flattening" });

    //  find a common face rectangle size that doesn't intersect the other face rectangles too much, and move the rectangle below the chin

    let bestRect = analyzeRectangles(persons, gSettings.vertDisplacement);

    // Put all layers under a group layer, "FaceTags"

    let faceTagsGroup = await executeAsModal(() => { return aDoc.createLayerGroup({ name: "FaceTags" }) });

    // For each person in the picture, make a text layer containing the persons's name on their chest in a TextItem.

    for (let i = 0; (i < persons.length) && (!stopTag); i++) {
        await addLayer(gSettings, persons[i], bestRect);
    }

    // squash all the artlayers into one "FaceTags" layer

    if (gSettings.merge)
        await executeAsModal(() => { return faceTagsGroup.merge() }, { commandName: "AddingLayer" });

    // apply backdrop effects

    if (gSettings.backStroke)
        await setOutsideStroke(gSettings);

    if (gSettings.portraitMode)
        await makeAPortrait(aDoc);


};

// load  persistent data

function restorePersistentData() {
    //localStorage.clear();
    gSettings.vertDisplacement = parseFloat(localStorage.getItem("vertDisplacement") || .8);
    gSettings.merge = (localStorage.getItem("merge") || "true") == "true";
    gSettings.backStroke = (localStorage.getItem("backStroke") || "true") == "true";
    gSettings.portraitMode = (localStorage.getItem("portraitMode") || "false") == "true";
    gSettings.fontSize = parseFloat(localStorage.getItem("fontSize") || 1.0);

    // SolidColors are stored as a hexValue string.
    const SolidColor = require("photoshop").app.SolidColor;
    gSettings.foreColor = new SolidColor();
    gSettings.foreColor.rgb.hexValue = localStorage.getItem("foreColor") || "0xffffff";
    gSettings.backColor = new SolidColor();
    gSettings.backColor.rgb.hexValue = localStorage.getItem("backColor") || "0x0000ff";
    console.log(displayDictionary('gSettings', gSettings));

}

function disableButtons() {
    document.getElementById("btnStop").removeAttribute("disabled");
    document.getElementById("btnMany").setAttribute("disabled", "true");
    document.getElementById("btnBatch").setAttribute("disabled", "true");
    document.getElementById("btnOne").setAttribute("disabled", "true");
    document.getElementById("merge").setAttribute("disabled", "true");
    document.getElementById("backStroke").setAttribute("disabled", "true");
    document.getElementById("portraitMode").setAttribute("disabled", "true");
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
    document.getElementById("btnBatch").removeAttribute("disabled");
    document.getElementById("btnOne").removeAttribute("disabled");
    document.getElementById("merge").removeAttribute("disabled");
    document.getElementById("backStroke").removeAttribute("disabled");
    document.getElementById("portraitMode").removeAttribute("disabled");
    document.getElementById("btnHelp").removeAttribute("disabled");
    document.getElementById("vSlider").removeAttribute("disabled");
    document.getElementById("fSlider").removeAttribute("disabled");
    document.getElementById("btnForeground").removeAttribute("disabled");
    document.getElementById("btnBackground").removeAttribute("disabled");
    stopTag = false;
}
/**
 * 
 * @param {*} entry a UXP File entry 
 * @returns true if the filetype is on the approved list for Face Tagging
 *          false if the extension is not approved
 */
function entryTypeIsOK(entry) {

    let flag = false;
    if (!entry.isFolder) {
        let fTypes = ['.bmp', /*'gif', */'.jpg', '.jpeg', '.png', '.psb', '.psd', '.tif', '.tiff'];
        fTypes.forEach((fType) => {
            if (entry.name.toLowerCase().endsWith(fType))
                flag = true;
        });
    }
    return flag;
}
/**
 * Erase all edits by rewinding to the first history state.
 * @param {*} aDoc // the active document 
 */
/* async function resetHistoryState(aDoc) {
    await executeAsModal(() => {
        if (aDoc.historyStates[0] != null) aDoc.activeHistoryState = aDoc.historyStates[0];
    }
        , { "commandName": "Resetting History" });
}; */
makeHelpDialogs();

