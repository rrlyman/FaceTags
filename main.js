
// copywrite 2023 Richard R. Lyman

// NOTE: if a photo has been edited in Lightroom Classic, then the metadata cannot be synced

const { entrypoints, xmp, storage } = require("uxp");
const { app, constants, imaging, action, core } = require("photoshop");

const batchPlay = action.batchPlay;
const SolidColor = app.SolidColor;
const xmpEntry = storage.Entry;
const xmpConstants = xmp.XMPConst;
const fs = storage.localFileSystem;

const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground } = require("./tagBatchPlay.js");
const { Tags } = require("./tagFace.js");
const { Gifs } = require("./tagGif.js");
//persons, subjects, html,  cmd, regionNames
const meta_persons = 0;
const meta_subjects = 1;
const meta_html = 2;
const meta_cmd = 3;
const meta_regionNames = 4;
// ################################  GLOBAL VARIABLES ##################################

/** if true the current operation is cancelled. */
let stopFlag = false;

/** Suffix to append to the target folder name saving the generated GIF files. */
const gifSuffix = "-gifs";

/** Suffix to append to each folder for all faceTag photos. */
const labeledSuffix = "-labeled";

/** gifs is the class for making GIFs */
const gifs = new Gifs();

/** tags is the class for making photos with person labels */
const tags = new Tags();

/** filterKeyword is the keyword used for selecting a person for making GIFS */
let filterKeyword = "";

/** dialogs are the help screens */
const dialogs = makeHelpDialogs();   // help dialogs

/**
 * runningList is IDs of elements  used to ENABLE buttons when running long operations
 */
const runningList = [];

/**
 * notRunningList is IDs of elements  used to DISABLE buttons when running long operations
 */
const notRunningList = [];

/** el is a directory of all the elements in the html document */
const el = {};

const elements = Array.from(document.querySelectorAll("*"));
elements.forEach((element) => {
    if (element.id != null && element.hasAttributes()) {
        el[element.id] = document.getElementById(element.id);
        if (element.attributes.getNamedItem("running") != null)
            runningList.push(element.id);
        else
            notRunningList.push(element.id);
    }
});

console.log("runningList " + JSON.stringify(runningList));
console.log("notRunningList " + JSON.stringify(notRunningList));
const fileToDebug = "20131123_184243";
const zKey = "x";
// ##############################  Restore Persistant State ##################################

const gSettings = {};

/**
 * load persistent gSettings data from the localStorage
*/
gSettings.vertDisplacement = parseFloat(localStorage.getItem("vertDisplacement") || -1.0);
gSettings.merge = (localStorage.getItem("merge") || "true") == "true";
gSettings.backStroke = (localStorage.getItem("backStroke") || "true") == "true";
gSettings.fullPhoto = (localStorage.getItem("fullPhoto") || "false") == "true";
gSettings.outputMode = parseInt((localStorage.getItem("outputMode")) || 0);
gSettings.fontSize = parseFloat(localStorage.getItem("fontSize") || 1.0);
gSettings.gifSpeed = parseFloat((localStorage.getItem("gifSpeed")) || .5);
gSettings.gifSize = parseInt(localStorage.getItem("gifSize") || 300);
gSettings.days = parseFloat((localStorage.getItem("days")) || 365.2425);
gSettings.foreColor = new SolidColor();
gSettings.foreColor.rgb.hexValue = localStorage.getItem("foreColor") || "0xffffff";
gSettings.backColor = new SolidColor();
gSettings.backColor.rgb.hexValue = localStorage.getItem("backColor") || "0x0000ff";
gSettings.charsPerFace = 10;  // not currently adjustable
console.log("gSettings " + JSON.stringify(gSettings));

// set all the visual elements to the gSettings values

el.merge.checked = gSettings.merge ? 1 : 0;
el.backStroke.checked = gSettings.backStroke ? 1 : 0;
el.fullPhoto.checked = gSettings.fullPhoto ? 1 : 0;
el.outputMode.value = gSettings.outputMode;
el.outputMode2.value = gSettings.outputMode;
el.keywordDropDown.value = filterKeyword;
el.daysSlider.value = gSettings.days;
el.days.value = gSettings.days.toFixed(2);
el.vertDisplacementSlider.value = gSettings.vertDisplacement;
el.vertDisplacement.value = gSettings.vertDisplacement.toFixed(1);
el.fontSizeSlider.value = gSettings.fontSize;
el.fontSize.value = gSettings.fontSize.toFixed(1);
el.gifSizeSlider.value = gSettings.gifSize;
el.gifSize.value = gSettings.gifSize.toFixed(0);
el.gifSpeedSlider.value = gSettings.gifSpeed;
el.gifSpeed.value = gSettings.gifSpeed.toFixed(1);
enableButtons();
setOutputModeChecked();


// ##############################  Register Event Listeners  ##################################

el.tagRefreshBtn.addEventListener("click", async () => { await tags.tagSingleFile(); });
el.createIndex.addEventListener("click", async () => { await gifs.createIndex(); });
el.btnTagFile.addEventListener("click", async () => { await tags.tagMultiFiles(); });
el.btnTagFolder.addEventListener("click", async () => { await tags.tagBatchFiles(); });
el.makeGIFs.addEventListener("click", async () => { await gifs.gifFolder(); });
el.btnHelp.addEventListener("click", async () => { dialogs[0].uxpShowModal(); });
el.btnHelp2.addEventListener("click", async () => { dialogs[5].uxpShowModal(); });
el.merge.addEventListener("change", async evt => {
    gSettings.merge = evt.target.checked;
    localStorage.setItem("merge", gSettings.merge.toString());
    await tags.tagSingleFile();;
});
el.backStroke.addEventListener("change", async evt => {
    gSettings.backStroke = evt.target.checked;
    localStorage.setItem("backStroke", gSettings.backStroke.toString());
    await tags.tagSingleFile();
});
el.fullPhoto.addEventListener("change", async evt => {
    gSettings.fullPhoto = evt.target.checked;
    localStorage.setItem("fullPhoto", gSettings.fullPhoto.toString());
});
async function outputModeEvent(evt) {
    gSettings.outputMode = parseInt(evt.target.value);
    localStorage.setItem("outputMode", gSettings.outputMode);
    await enableButtons();
    setOutputModeChecked();
    if (gSettings.outputMode < 2)
        await tags.tagSingleFile();
};
el.outputMode.addEventListener("change", async evt => outputModeEvent(evt));
el.outputMode2.addEventListener("change", async evt => outputModeEvent(evt));

el.vertDisplacement.addEventListener("keydown", async evt => { if (evt.key == "Enter") textToSlider(evt, "vertDisplacement") });
el.vertDisplacement.addEventListener("change", async evt => { await textToSlider(evt, "vertDisplacement") });
el.vertDisplacementSlider.addEventListener("change", async evt => { await sliderToText(evt, "vertDisplacement", 1); });

el.fontSize.addEventListener("change", async evt => { await textToSlider(evt, "fontSize") });
el.fontSize.addEventListener("keydown", async evt => { if (evt.key == "Enter") await textToSlider(evt, "fontSize") });
el.fontSizeSlider.addEventListener("change", async evt => { await sliderToText(evt, "fontSize", 1); });

el.dropMenu.addEventListener("change", evt => {
    filterKeyword = evt.target.value;
    el.keywordDropDown.value = filterKeyword;
});
el.foreColor.addEventListener("click", async evt => {
    await setForeground();
    localStorage.setItem("foreColor", gSettings.foreColor.rgb.hexValue);
    await tags.tagSingleFile();;

});
el.backColor.addEventListener("click", async evt => {
    await setBackground();
    localStorage.setItem("backColor", gSettings.backColor.rgb.hexValue);
    await tags.tagSingleFile();;
});
async function stopButtonEvent(evt) {
    await enableButtons();
    stopFlag = true;
};
el.days.addEventListener("change", async evt => { await textToSlider(evt, "days"); });
el.days.addEventListener("keydown", async evt => { if (evt.key == "Enter") await textToSlider(evt, "days") });
el.daysSlider.addEventListener("change", async evt => { await sliderToText(evt, "days", 2); });

el.gifSpeed.addEventListener("change", async evt => { await textToSlider(evt, "gifSpeed"); });
el.gifSpeed.addEventListener("keydown", async evt => { if (evt.key == "Enter") await textToSlider(evt, "gifSpeed") });
el.gifSpeedSlider.addEventListener("change", async evt => { await sliderToText(evt, "gifSpeed", 1); });

el.gifSize.addEventListener("change", async evt => { await textToSlider(evt, "gifSize"); });
el.gifSize.addEventListener("keydown", async evt => { if (evt.key == "Enter") await textToSlider(evt, "gifSize") });
el.gifSizeSlider.addEventListener("change", async evt => { await sliderToText(evt, "gifSize", 0); });

el.btnStop.addEventListener("click", evt => stopButtonEvent(evt));
el.btnStop2.addEventListener("click", evt => stopButtonEvent(evt));


// ##############################  Utility Functions ##################################

/** Given an event from a textField, convert that value to a slider position and set into the slider.
 * If the value is outside of the Slider range, set the textField to the "invalid" state.
 *  
 * @param {*} evt Event from slider movement
 * @param {*} textID ID of the textField
 */
async function textToSlider(evt, textID) {
    const sliderID = textID + "Slider";
    let v = parseFloat(evt.target.value);
    if (checkValid(v >= el[sliderID].getAttribute("min") && v <= el[sliderID].getAttribute("max"), textID)) {
        gSettings[textID] = parseFloat(evt.target.value);
        el[sliderID].value = v;
        localStorage.setItem(textID, gSettings[textID]);
        if (gSettings.outputMode < 2)
            await tags.tagSingleFile();
    }
};

/** Convert a slider value to a text value truncated to n decimal places
 * and set the value in the textField.
 *  
 * @param {*} evt Event from element
 * @param {*} textID The base name of the element ID
 * @param {*} nPlaces  The number of places to show in the textfield
 */
async function sliderToText(evt, textID, nPlaces) {
    gSettings[textID] = evt.target.value;
    el[textID].value = gSettings[textID].toFixed(nPlaces);
    localStorage.setItem(textID, gSettings[textID]);
    if (gSettings.outputMode < 2)
        await tags.tagSingleFile();
};

/**
 * If the condition is true, set the attributes to valid for the textBox,
 * If the condition is false, set the attributes of the texbox to invalid.
 * @param {*} condition 
 * @param {*} textBoxId 
 */
function checkValid(condition, textBoxId) {
    if (condition) {
        el[textBoxId].setAttribute("valid", "true");
        el[textBoxId].removeAttribute("invalid");
    } else {
        el[textBoxId].setAttribute("invalid", "true");
        el[textBoxId].removeAttribute("valid");
    }
    return condition;
};

/**
 * 
 * @param {str} str Set the element with ID == str to enabled  
 */
function enableButton(str) {
    el[str].removeAttribute("disabled");
};

/**
 * 
 * @param {str} str Set the element with ID == str to disabled  
 */
function disableButton(str) {
    el[str].setAttribute("disabled", "true");
};

/** Set text in the progressbar
 * 
 * @param {*} str Text to put in the status label above the progressBar
 */
function setStatus(str) {
    el.status.innerHTML = str;
    el.status2.innerHTML = str;
};

/**
 * Set all the buttons in the notRunningList to enabled.
 * Set all the buttons in the runningList to disabled.
 * 
 */
async function enableButtons() {
    notRunningList.forEach((btn) => enableButton(btn));
    runningList.forEach((btn) => disableButton(btn));
    // disable makeGifs until an index has been built.
    if (gSettings.outputMode === 2 && gifs.originalPhotosFolder == null) disableButton("makeGIFs");
    setStatus("");
    await progressbar.setVal(0);
};

/**
*  Set all the buttons in the notRunningList to disabled'
 * Set all the buttons in the runningList to enabled.
 * 
 * @param {*} str Text to put in the status label above the progressBar
 */
async function disableButtons(str) {
    notRunningList.forEach((btn) => disableButton(btn));
    runningList.forEach((btn) => enableButton(btn));
    setStatus(str);
    await progressbar.setVal(0);
    stopFlag = false;
};

/** Set the radio buttons to a checked state based on the outputMode setting and show the tag or gif panel elements
 * 
 */
function setOutputModeChecked() {
    el.rb0.checked = el.rb02.checked = gSettings.outputMode == 0 ? 1 : 0;
    el.rb1.checked = el.rb12.checked = gSettings.outputMode == 1 ? 1 : 0;
    el.rb2.checked = el.rb22.checked = gSettings.outputMode == 2 ? 1 : 0;
    el.tags.className = gSettings.outputMode < 2 ? "sp-tab-page visible" : "sp-tab-page ";
    el.gifs.className = gSettings.outputMode == 2 ? "sp-tab-page visible" : "sp-tab-page ";
};

/** progress bar at the top of the dialog box */
let progressbar = {
    lastProgressVal: 0,
    iVal: 0,
    set max(newMax) {
        this.max = newMax;
        this.iVal = 0;
    },
    max: 0,

    /** Increment the last progressbar position and update the element.
     * 
     */
    async incVal() { await this.setVal(this.iVal + 1) },

    /** Fill in the progress bar with a new value;
     * 
     * @param {*} val Value to put in the progress bar in the range [0,max]
     */
    async setVal(val) {
        this.iVal = val;
        const newVal = (val / this.max).toFixed(2);  // make 100 intervals along the bar
        if (newVal != this.lastProgressVal) {  // omit delay, if no redraw is needed
            this.lastProgressVal = newVal;
            el.progressBar.value = newVal;
            el.progressBar2.value = newVal;
            await new Promise(r => setTimeout(r, 10));    // a slight break is need to draw the progressbar  
        }
    }
}

/** replacement for executeAsModal that catches errors.
 * 
 * @param {*} x1 anonymous function to be called in excuteAsModel, parameters are (executionContect, description)
 * @param {*} x2 a dictionary containing "commandName"
 * @returns 
 */
async function xModal(x1, x2) {
    try {
        return core.executeAsModal(x1, x2).catch((reason) => {
            console.log(x2);
            console.log(reason);
            throw reason;
        });
    } catch (e) {
        // find programming errors 
        alert(e + JSON.stringify(x2));
        stopFlag = true;
        return new Promise(r => setTimeout(r, 100));
    }
};



