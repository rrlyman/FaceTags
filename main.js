
// copywrite 2023 Richard R. Lyman
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

// ################################  GLOBAL VARIABLES ##################################

let stopFlag = false;
const gifSuffix = "-gifs";
const labeledSuffix = "-labeled";
const gifs = new Gifs();
const tags = new Tags();
let filterKeyword = "";

const dialogs = makeHelpDialogs();   // help dialogs

/**
 * runningList is IDs of elements  used to ENABLE buttons when running long operations
 */
const runningList = [];
/**
 * notRunningList is IDs of elements  used to DISABLE buttons when running long operations
 */
const notRunningList = [];

const elements = Array.from(document.querySelectorAll("*"));
elements.forEach((element) => {
    if (element.id != null && element.hasAttributes()) {
        if (element.attributes.getNamedItem("running") != null)
            runningList.push(element.id);
        else
            notRunningList.push(element.id);
    }
});

console.log("runningList " + JSON.stringify(runningList));
console.log("notRunningList " + JSON.stringify(notRunningList));

// ##############################  Restore Persistant State ##################################

const gSettings = {};
/**
 * load persistent gSettings data from the localStorage
*/
gSettings.vertDisplacement = parseFloat(localStorage.getItem("vertDisplacement") || -.9);
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

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("fullPhoto").checked = gSettings.fullPhoto ? 1 : 0;
document.getElementById("outputMode").value = gSettings.outputMode;
document.getElementById("outputMode2").value = gSettings.outputMode;
document.getElementById("keywordDropDown").value = filterKeyword;
document.getElementById("daysSlider").value = gSettings.days;
document.getElementById("days").value = gSettings.days.toFixed(2);
document.getElementById("vertDisplacementSlider").value = gSettings.vertDisplacement;
document.getElementById("vertDisplacement").value = gSettings.vertDisplacement.toFixed(2);
document.getElementById("fontSizeSlider").value = gSettings.fontSize;
document.getElementById("fontSize").value = gSettings.fontSize.toFixed(2);
document.getElementById("gifSizeSlider").value = gSettings.gifSize;
document.getElementById("gifSize").value = gSettings.gifSize.toFixed(0);
document.getElementById("gifSpeedSlider").value = gSettings.gifSpeed;
document.getElementById("gifSpeed").value = gSettings.gifSpeed.toFixed(2);
enableButtons();
setOutputModeChecked();


// ##############################  Register Event Listeners  ##################################

document.getElementById("tagRefreshBtn").addEventListener("click", () => { tags.tagSingleFile(); });
document.getElementById("createIndex").addEventListener("click", () => { gifs.createIndex(); });
document.getElementById("btnTagFile").addEventListener("click", () => { tags.tagMultiFiles(); });
document.getElementById("btnTagFolder").addEventListener("click", () => { tags.tagBatchFiles(); });
document.getElementById("makeGIFs").addEventListener("click", () => { gifs.gifFolder(); });
document.getElementById("btnHelp").addEventListener("click", () => { dialogs[0].uxpShowModal(); });
document.getElementById("btnHelp2").addEventListener("click", () => { dialogs[5].uxpShowModal(); });
document.getElementById("merge").addEventListener("change", evt => {
    gSettings.merge = evt.target.checked;
    localStorage.setItem("merge", gSettings.merge.toString());
    tags.tagSingleFile();;
});
document.getElementById("backStroke").addEventListener("change", evt => {
    gSettings.backStroke = evt.target.checked;
    localStorage.setItem("backStroke", gSettings.backStroke.toString());
    tags.tagSingleFile();;
});
document.getElementById("fullPhoto").addEventListener("change", evt => {
    gSettings.fullPhoto = evt.target.checked;
    localStorage.setItem("fullPhoto", gSettings.fullPhoto.toString());
});
async function outputModeEvent(evt) {
    gSettings.outputMode = parseInt(evt.target.value);
    localStorage.setItem("outputMode", gSettings.outputMode);
    await enableButtons();
    setOutputModeChecked();
    if (gSettings.outputMode < 2)
        tags.tagSingleFile();
};
document.getElementById("outputMode").addEventListener("change", evt => outputModeEvent(evt));
document.getElementById("outputMode2").addEventListener("change", evt => outputModeEvent(evt));

document.getElementById("vertDisplacement").addEventListener("keydown", evt => { if (evt.key == "Enter") textToSlider(evt, "vertDisplacement") });
document.getElementById("vertDisplacement").addEventListener("change", evt => { textToSlider(evt, "vertDisplacement") });
document.getElementById("vertDisplacementSlider").addEventListener("change", evt => { sliderToText(evt, "vertDisplacement", 2); });

document.getElementById("fontSize").addEventListener("change", evt => { textToSlider(evt, "fontSize") });
document.getElementById("fontSize").addEventListener("keydown", evt => { if (evt.key == "Enter") textToSlider(evt, "fontSize") });
document.getElementById("fontSizeSlider").addEventListener("change", evt => { sliderToText(evt, "fontSize", 2); });

document.getElementById("dropMenu").addEventListener("change", evt => {
    filterKeyword = evt.target.value;
    document.getElementById("keywordDropDown").value = filterKeyword;
});
document.getElementById("foreColor").addEventListener("click", evt => {
    setForeground();
    localStorage.setItem("foreColor", gSettings.foreColor.rgb.hexValue);
    tags.tagSingleFile();;
});
document.getElementById("backColor").addEventListener("click", evt => {
    setBackground();
    localStorage.setItem("backColor", gSettings.backColor.rgb.hexValue);
    tags.tagSingleFile();;
});
async function stopButtonEvent(evt) {
    await enableButtons();
    stopFlag = true;
};
document.getElementById("days").addEventListener("change", evt => { textToSlider(evt, "days"); });
document.getElementById("days").addEventListener("keydown", evt => { if (evt.key == "Enter") textToSlider(evt, "days") });
document.getElementById("daysSlider").addEventListener("change", evt => { sliderToText(evt, "days", 2); });

document.getElementById("gifSpeed").addEventListener("change", evt => { textToSlider(evt, "gifSpeed"); });
document.getElementById("gifSpeed").addEventListener("keydown", evt => { if (evt.key == "Enter") textToSlider(evt, "gifSpeed") });
document.getElementById("gifSpeedSlider").addEventListener("change", evt => { sliderToText(evt, "gifSpeed", 2); });

document.getElementById("gifSize").addEventListener("change", evt => { textToSlider(evt, "gifSize"); });
document.getElementById("gifSize").addEventListener("keydown", evt => { if (evt.key == "Enter") textToSlider(evt, "gifSize") });
document.getElementById("gifSizeSlider").addEventListener("change", evt => { sliderToText(evt, "gifSize", 0); });

document.getElementById("btnStop").addEventListener("click", evt => stopButtonEvent(evt));
document.getElementById("btnStop2").addEventListener("click", evt => stopButtonEvent(evt));


// ##############################  Utility Functions ##################################


/** Given an event from a textField, convert that value to a slider position and set into the slider.
 * If the value is outside of the Slider range, set the textField to the "invalid" state.
 *  
 * @param {*} evt Event from slider movement
 * @param {*} textID ID of the textField
 */
function textToSlider(evt, textID) {
    const sliderID = textID + "Slider";
    let v = parseFloat(evt.target.value);
    if (checkValid(v >= document.getElementById(sliderID).getAttribute("min") && v <= document.getElementById(sliderID).getAttribute("max"), textID)) {
        gSettings[textID] = parseFloat(evt.target.value);
        document.getElementById(sliderID).value = v;
        localStorage.setItem(textID, gSettings[textID]);
        if (gSettings.outputMode < 2)
            tags.tagSingleFile();
    }
};

/**
 * If the condition is true, set the attributes to valid for the textBox,
 * If the condition is false, set the attributes of the texbox to invalid.
 * @param {*} condition 
 * @param {*} textBoxId 
 */
function checkValid(condition, textBoxId) {
    if (condition) {
        document.getElementById(textBoxId).setAttribute("valid", "true");
        document.getElementById(textBoxId).removeAttribute("invalid");
    } else {
        document.getElementById(textBoxId).setAttribute("invalid", "true");
        document.getElementById(textBoxId).removeAttribute("valid");
    }
    return condition;
};
/**
 * 
 * @param {str} str Set the element with ID == str to enabled  
 */
function enableButton(str) {
    document.getElementById(str.toString()).removeAttribute("disabled");
};
/**
 * 
 * @param {str} str Set the element with ID == str to disabled  
 */
function disableButton(str) {
    document.getElementById(str).setAttribute("disabled", "true");
};
/** Set text in the progressbar
 * 
 * @param {*} str Text to put in the status label above the progressBar
 */
function setStatus(str) {
    document.getElementById("status").innerHTML = str;
    document.getElementById("status2").innerHTML = str;
}
/***
 * Set all the buttons in the notRunningList to enabled.
 * Set all the buttons in the runningList to disabled.
 * 
 */
async function enableButtons() {
    notRunningList.forEach((btn) => enableButton(btn));
    runningList.forEach((btn) => disableButton(btn));
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

/** Convert a slider value to a text value truncated to n decimal places
 * and set the value in the textField.
 *  
 * @param {*} evt Event from element
 * @param {*} textID The base name of the element ID
 * @param {*} nPlaces  The number of places to show in the textfield
 */
function sliderToText(evt, textID, nPlaces) {
    gSettings[textID] = evt.target.value;
    document.getElementById(textID).value = gSettings[textID].toFixed(nPlaces);
    localStorage.setItem(textID, gSettings[textID]);
    if (gSettings.outputMode < 2)
        tags.tagSingleFile();
};

/** Set the radio buttons to a checked state based on the outputMode setting and show the tag or gif panel elements
 * 
 */
function setOutputModeChecked() {
    document.getElementById("rb0").checked = document.getElementById("rb02").checked = gSettings.outputMode == 0 ? 1 : 0;
    document.getElementById("rb1").checked = document.getElementById("rb12").checked = gSettings.outputMode == 1 ? 1 : 0;
    document.getElementById("rb2").checked = document.getElementById("rb22").checked = gSettings.outputMode == 2 ? 1 : 0;
    document.getElementById("tags").className = gSettings.outputMode < 2 ? "sp-tab-page visible" : "sp-tab-page ";
    document.getElementById("gifs").className = gSettings.outputMode == 2 ? "sp-tab-page visible" : "sp-tab-page ";
};

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
            document.getElementById("progressBar").value = newVal;
            document.getElementById("progressBar2").value = newVal;
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
        let p1 = await core.executeAsModal(x1, x2).catch((reason) => {console.log(reason)});
        return p1;
    } catch (e) {
        // find programming errors 
        alert(e + JSON.stringify(x2));
        stopFlag = true;
        return null;
    }
};



