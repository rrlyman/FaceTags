
// copywrite 2023 Richard R. Lyman
const { executeAsModal } = require("photoshop").core;
const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { setOutsideStroke, makeAPortrait, trim } = require("./tagBatchPlay.js");
const { analyzeRectangles, addLayer, displayDictionary } = require("./tagAddLayer.js");

/**
 * If an entry contains tagged or giffed information, then skip it
 * @param {*} entry 
 * @returns true if the entry should be skipped.
 */
function skipThisEntry(entry) {
   
    let illegalName = 
    entry.name.includes(gifSuffix + "_") ||
    entry.name.endsWith(gifSuffix) ||
    entry.name.includes(labeledSuffix + "_") ||
    entry.name.endsWith(labeledSuffix) ||
    entry.name.startsWith(".");


    let legalType = true;
    if (!entry.isFolder) {
        legalType = false;
        let fTypes = ['.bmp', /*'gif', */'.jpg', '.jpeg', '.png', '.psb', '.psd', '.tif', '.tiff'];
        fTypes.forEach((fType) => {
            let eName = entry.name.toLowerCase();
            if (eName.endsWith(fType)) {
                if (eName.replace(fType, "").length > 0)
                legalType = true;
            }
        });
    }
    return (!legalType) || illegalName;
    
};

/**
 * 
 * @param {*} entry a UXP File entry for the disk file to be opened and tagged
 * 
 * @returns false if the file type is not on the list to be facetagged or there are no persons to facetag.
 */
async function openAndTagFileFromDisk(entry) {
    const app = require('photoshop').app;

    if (persons.length == 0)
        return false;
    await executeAsModal(() => app.open(entry), { "commandName": "Opening batched File" });
    let aDoc = app.activeDocument;
    if (aDoc != null) {
        await faceTagTheImage(persons);
    } else {
        await executeAsModal(() => aDoc.closeWithoutSaving(), { "commandName": "Closing" });
        await new Promise(r => setTimeout(r, 100));    // required to give time process Cancel Button               
        return false;
    }

    await new Promise(r => setTimeout(r, 100));    // required to give time process Cancel Button  
    return true;
}

/**
 * Determine the suffix of the labeledDirectory folder by finding previous versions and adding 1 to the _n suffix of the folder name.
 */
/**
 * 
 * @param {*} ents List of files and folders of the top level folder 
 * @returns The name of the labeledDirectory top level folder
 */
function getFaceTagsTreeName(originalName, ents, suffix) {
    let iMax = 0;
    let targetFolder = originalName + suffix;
    for (let i1 = 0; i1 < ents.length; i1++) {
        if (ents[i1].name.startsWith(targetFolder)) {
            let results = ents[i1].name.split("_");
            if (results.length > 1) {
                let x = Number(results.pop())
                if (x > iMax) iMax = x;
            }
        }
    }
    iMax++;
    let faceName = targetFolder + "_" + iMax.toString();
    return faceName;
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
        let persons = readPersonsFromMetadata(null);
        dontAsk = false;
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
    disableButtons();
    // Put up a dialog box, and get a list of file(s) to face tag.

    const files = await fs.getFileForOpening({ allowMultiple: true });

    dontAsk = false; // puts up only one alert for missing metadata when loading a bunch of files

    for (let i = 0; i < files.length && (!stopTag); i++) {
        if (! await openAndTagFileFromDisk(files[i]))
            continue;
    }
    enableButtons();
};

/**
 * Opens up a folder dialog box to select top folder to process
 * Makes a new folder called originalPhotosFolder-labelled_n and builds a tree under it that duplicates
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

    dontAsk = true;  // omit no perssons found message

    // make the newFolder in the FaceTags Tree to hold tagged version of the files in the originalPhotosFolder

    if (originalPhotosFolder == null) {  // null is the initial call
        topRecursionLevel = true;
        originalPhotosFolder = await fs.getFolder();
        if (originalPhotosFolder == null) {  // null if user cancels dialog              
            return;
        }
        disableButtons();  // only enable the Cancel button                
        // create the top level labeledDirectoryFolder
        const ents = await originalPhotosFolder.getEntries();
        newFolder = await originalPhotosFolder.createFolder(getFaceTagsTreeName(originalPhotosFolder.name, ents, labeledSuffix));


    } else {

        // traverse the labeledDirectory folder with an folder names similar to the original folder tree
        newFolder = await labeledDirectoryFolder.createFolder(originalPhotosFolder.name + labeledSuffix);
    }

    // process all the files and folders in the originalPhotosFolder
    if (newFolder != null) {
        const entries = await originalPhotosFolder.getEntries();
        for (let i = 0; (i < entries.length) && (!stopTag); i++) {
            const entry = entries[i];;

            if (skipThisEntry(entry))
                continue;

            // recurse folders

            if (entry.isFolder) {
                await tagBatchFiles(entry, newFolder);
            } else {

                ////////////////////     PAYLOAD START     /////////////////////      

                // Facetag the file                 
                if (! await openAndTagFileFromDisk(entry))
                    continue;

                // and save it
                let aDoc = app.activeDocument;
                await executeAsModal(() => aDoc.flatten(), { "commandName": "Flattening" });   // required to save png 
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
        enableButtons();
        console.log("topRecursionLevel");
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

    // start with clean document  
    resetHistoryState(aDoc);
    await executeAsModal(() => aDoc.flatten(), { "commandName": "Flattening" });

    //  find a common face rectangle size that doesn't intersect the other face rectangles too much, and move the rectangle below the chin

    let bestRect = analyzeRectangles(persons, gSettings.vertDisplacement);
    if ((bestRect.w > 0) && (bestRect.h > 0)) {

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

        // convert to portrait format image

        if (gSettings.outputMode == 1)
            await makeAPortrait(aDoc);

    }

};

/**
 * Erase all edits by rewinding to the first history state.
 * @param {*} aDoc // the active document 
 */
async function resetHistoryState(aDoc) {
    await executeAsModal(() => {
        if (aDoc.historyStates[0] != null) aDoc.activeHistoryState = aDoc.historyStates[0];
    }
        , { "commandName": "Resetting History" });
};


module.exports = {
    tagSingleFile, tagMultiFiles, tagBatchFiles, getFaceTagsTreeName, skipThisEntry
};