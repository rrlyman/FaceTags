
// copywrite 2023 Richard R. Lyman
const {executeAsModal} = require("photoshop").core;
const {batchPlay} = require("photoshop").action;
const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground, setOutsideStroke, makeAPortrait } = require("./tagBatchPlay.js");
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
    console.log(displayDictionary('gSettings foreColorX',gSettings));
    localStorage.setItem("foreColor", gSettings.foreColor.rgb.hexValue);
    console.log(displayDictionary('gSettings foreColor',gSettings));
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

let dontAsk = false;
/**
 * Freshes the FaceTags for the currently open active document
 */
async function tagSingleFile() {

    const app = require('photoshop').app;
    let aDoc = app.activeDocument;

    if (app.documents.length == 0) {
        alert("No file is loaded. In PhotoShop Classic, load a file before running the script!");
    } else {
        await resetHistoryState(aDoc); // erases all previous edits
        let persons = readPersonsFromMetadata();
        await faceTagTheImage(persons);
    }
};

/**
 * Opens up a file dialog box which returns a list of files to process
 * Annotates each file with the face tag labels for each person found in the file metadata 
 */
async function tagMultiFiles() {

    const fs = require('uxp').storage.localFileSystem;
    const app = require('photoshop').app;  
    disableButtons();  // only enable the Cancel button

    // Put up a dialog box, and get a list of file(s) to face tag.

    const files = await fs.getFileForOpening({ allowMultiple: true});       

    dontAsk = false; // puts up only one alert for missing metadata when loading a bunch of files

    for (let i = 0; i < files.length && ( !stopTag); i++) {
        if (!entryTypeIsOK (files[i])) 
            continue;
    
        await executeAsModal(() => app.open(files[i]), { "commandName": "Opening a File" });

        let aDoc = app.activeDocument;
        if (aDoc != null) {
        await resetHistoryState(aDoc);  // erases all previous edits

        let persons = readPersonsFromMetadata(aDoc.path);
        await faceTagTheImage(persons);
        }

    }

    enableButtons();   // disable the Cancel button and enable the others
};

function entryTypeIsOK (entry) {

  
    let flag = false;
    let fTypes = ['bmp', /*'gif', */'jpg', 'jpeg', 'png', 'psb', 'psd','tif','tiff' ];
    fTypes.forEach( (fType) => {
       // console.log(entry.name.toLowerCase() + ", " + fType);
        if (entry.name.toLowerCase().endsWith(fType))
        flag=true;
    });
    return flag;
}
/**
 * Opens up a folder dialog box to select top folder to process
 * Makes a new folder called FaceTaggedPhoto and builds a tree under it that duplicates
 * the source tree. Populates it with tagged photos of the originals.
 * 
 * Annotates each file with the face tag labels for each person found in the file metadata 
 */

let recursiveLevel = 0;
async function tagBatchFiles(sourceEntry, targetEntry ) {
    const lfs = require('uxp').storage.localFileSystem;
    const app = require('photoshop').app;
 
    dontAsk = true;
    console.log("entering = "+recursiveLevel);
    recursiveLevel++;
    if (sourceEntry==null) {

        sourceEntry = await lfs.getFolder();
        const entriesX= await sourceEntry.getEntries();
        let iMax = 0;
        for (let i1 = 0; i1 < entriesX.length ; i1++) {
            if (entriesX[i1].name.startsWith("FaceTaggedPhotos")){
                let results = entriesX[i1].name.split("_");
                let x = Number(results[1])
                console.log("suf "+x);
                if ( x> iMax) iMax = x;
            }
        }
        iMax++;
        let faceName ="FaceTaggedPhotos_" + iMax.toString();     
        targetEntry = await sourceEntry.createFolder(faceName);

    }  else 
        targetEntry = await targetEntry.createFolder(sourceEntry.name)  ;
    
    const entries = await sourceEntry.getEntries();
    for (let i = 0; (i < entries.length) && (!stopTag); i++) {
        const entry = entries[i];
        //console.log(entry.nativePath)   ;     
        if (entry.isFolder && ! entry.name.startsWith("FaceTaggedPhotos"))
        {                 
            await tagBatchFiles(entry, targetEntry);
        } else {
            if (!entryTypeIsOK (entry)) 
                continue;

            await executeAsModal(() => app.open(entry), { "commandName": "Opening batched File" });
            let aDoc = app.activeDocument;
            if (aDoc != null) {
                let persons = readPersonsFromMetadata(aDoc.path);
                if ((persons.length>0) && ( !stopTag)) {   
                    await faceTagTheImage(persons);             
                    await executeAsModal(() =>  aDoc.flatten(), { "commandName": "Flattening" });          
                    let saveEntry = await targetEntry.createFile(aDoc.name);
                    await executeAsModal(() =>   aDoc.saveAs.png(saveEntry), { "commandName": "Saving" }); 
                }
                await executeAsModal(() =>   aDoc.closeWithoutSaving(), { "commandName": "Closing" });                 
            }
        }
    };
    recursiveLevel--;
    console.log("exiting level = " + recursiveLevel);    
    if (recursiveLevel == 0){
        console.log("enabling buttons"); 
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
    const actn = require('photoshop').action;
    const constants = require("photoshop").constants;

    let gDoc = app.activeDocument;

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

    //  find a common face rectangle size that doesn't intersect the other face rectangles too much, and move the rectangle below the chin

    let bestRect = analyzeRectangles(persons, gSettings.vertDisplacement);

    // Put all layers under a group layer, "FaceTags"

    let faceTagsGroup = await executeAsModal(() => { return gDoc.createLayerGroup({ name: "FaceTags" }) });

    // For each person in the picture, make a text layer containing the persons's name on their chest in a TextItem.

    for (let i = 0; (i < persons.length) && ( !stopTag); i++) {
       
        await addLayer(gSettings, persons[i], bestRect);
    }

    // squash all the artlayers into one "FaceTags" layer

    if (gSettings.merge)
        await executeAsModal(() => { return faceTagsGroup.merge() }, { commandName: "AddingLayer" });

    // apply backdrop effects

    if (gSettings.backStroke)
        await setOutsideStroke(gSettings);   // add background around the text

    if (gSettings.portraitMode)
        await makeAPortrait(gDoc);

    await new Promise(r => setTimeout(r, 200));    // make to see the result and click the Cancel Button  
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
    console.log(displayDictionary('gSettings',gSettings));
      
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

makeHelpDialogs();
/**
 * Erase all edits by rewinding to the first history state.
 * @param {*} aDoc // the active document 
 */
async function resetHistoryState(aDoc) {
     await executeAsModal(() => {
        if (aDoc.historyStates[0] != null) aDoc.activeHistoryState  = aDoc.historyStates[0]; 
    }
    , { "commandName": "Resetting History" }); 
};
