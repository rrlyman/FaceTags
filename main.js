
// copywrite 2023 Richard R. Lyman
const { entrypoints, xmp } = require("uxp");
const xmpEntry = require('uxp').storage.Entry;
const xmpConstants = require('uxp').xmp.XMPConst;
const fs = require('uxp').storage.localFileSystem;

// const core = require('photoshop').core;
const { core, executeAsModal } = require("photoshop").core;
const SolidColor = require("photoshop").app.SolidColor;
const { app, constants } = require("photoshop");
const { batchPlay } = require("photoshop").action;
const imaging = require("photoshop").imaging;
const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground } = require("./tagBatchPlay.js");
const { Tags } = require("./tagFace.js");
const { Gifs } = require("./tagGif.js");

// ################################  GLOBAL VARIABLES ##################################

let stopTag = false;
const gifSuffix = "-gifs";
const labeledSuffix = "-labeled";
const gifs = new Gifs();
const tags = new Tags();
let filterKeyword = "";

/** @type limits are the bounds, left and right for the sliders. e.g. gifSize minR 10 means that a slider all the way to the left corresponds to a 10 gifSize.
*/
const limits = {
    gifSizeSlider: { minR: 10, maxR: 5000 },
    fontSizeSlider: { minR: .1, maxR: 3 },
    gifSpeedSlider: { minR: 0, maxR: 20 },
    vertDisplacementSlider: { minR: -3, maxR: 3 },
    daysSlider: { minR: 0, maxR: 1000 },
}

const dialogs = makeHelpDialogs();   // help dialogs

/**
 * runningList is IDs of elements  used to ENABLE buttons when running long operations
 */
const runningList = Array(0);
/**
 * notRunningList is IDs of elements  used to DISABLE buttons when running long operations
 */
const notRunningList = Array(0);

const elements = Array.from(document.querySelectorAll("*"));
elements.forEach((element) => {
    if (element.id != null && element.hasAttributes()) {
        if (element.attributes.getNamedItem("running") != null)
            runningList.push(element.id);
        else
            notRunningList.push(element.id);
    }

    /*     // restore persistent data and default
        // set the value into the element
        // register event
        
        switch (element.tagName) {
            case "sp-slider":
                switch (element.id) {
                    case 
                }
                break;
            case "sp-picker":
            case "sp-menu":
            case "sp-checkbox":
            case "sp-button":
            case "sp-divider":
            case "sp-textField":
            case "sp-radio":
            case "sp-radiogroup":
            case "sp-progressbar":
            case "sp-tab-page":
            default:
        }*/
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

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("fullPhoto").checked = gSettings.fullPhoto ? 1 : 0;
document.getElementById("outputMode").value = gSettings.outputMode;
document.getElementById("outputMode2").value = gSettings.outputMode;
document.getElementById("keywordDropDown").value = filterKeyword;

document.getElementById("daysSlider").value = sliderFromVal(gSettings.days, limits.daysSlider);
document.getElementById("days").value = gSettings.days.toFixed(2);

document.getElementById("vertDisplacementSlider").value = sliderFromVal(gSettings.vertDisplacement, limits.vertDisplacementSlider);
document.getElementById("vertDisplacement").value = gSettings.vertDisplacement.toFixed(2);

document.getElementById("fontSizeSlider").value = sliderFromVal(gSettings.fontSize, limits.fontSizeSlider);
document.getElementById("fontSize").value = gSettings.fontSize.toFixed(2);

document.getElementById("gifSizeSlider").value = sliderFromVal(gSettings.gifSize, limits.gifSizeSlider);
document.getElementById("gifSize").value = gSettings.gifSize.toFixed(0);

document.getElementById("gifSpeedSlider").value = sliderFromVal(gSettings.gifSpeed, limits.gifSpeedSlider);
document.getElementById("gifSpeed").value = gSettings.gifSpeed.toFixed(2);
enableButtons();
setOutputModeChecked();

/* // attach event listeners for tabs
Array.from(document.querySelectorAll(".sp-tab")).forEach(theTab => {
    theTab.onclick = () => {
      localStorage.setItem("currentTab", theTab.getAttribute("id"));
      Array.from(document.querySelectorAll(".sp-tab")).forEach(aTab => {
        if (aTab.getAttribute("id") === theTab.getAttribute("id")) {
          aTab.classList.add("selected");
        } else {
          aTab.classList.remove("selected");
        }
      });
      Array.from(document.querySelectorAll(".sp-tab-page")).forEach(tabPage => {
        if (tabPage.getAttribute("id").startsWith(theTab.getAttribute("id"))) {
          tabPage.classList.add("visible");
        } else {
          tabPage.classList.remove("visible");
        }
      });
    }
  }); */
// ##############################  Register Event Listeners  ##################################

document.getElementById("tagRefreshBtn").addEventListener("click", () => {
    tags.tagSingleFile();
});
document.getElementById("createIndex").addEventListener("click", () => {
    gifs.createIndex();
});
document.getElementById("btnTagFile").addEventListener("click", () => {
    tags.tagMultiFiles();
});
document.getElementById("btnTagFolder").addEventListener("click", () => {
    tags.tagBatchFiles();
});
document.getElementById("makeGIFs").addEventListener("click", () => {
    gifs.gifBatchFiles();
});
document.getElementById("btnHelp").addEventListener("click", () => {
    dialogs[0].uxpShowModal();
});
document.getElementById("btnHelp2").addEventListener("click", () => {
    dialogs[5].uxpShowModal();
});
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
}
document.getElementById("outputMode").addEventListener("change", evt => outputModeEvent(evt));
document.getElementById("outputMode2").addEventListener("change", evt => outputModeEvent(evt));
document.getElementById("daysSlider").addEventListener("change", evt => {
    sliderToText(evt.target.value, "days", 2);
});
document.getElementById("vertDisplacementSlider").addEventListener("change", evt => {
    sliderToText(evt.target.value, "vertDisplacement", 2);
    tags.tagSingleFile();
});
document.getElementById("gifSizeSlider").addEventListener("change", evt => {
    sliderToText(evt.target.value, "gifSize", 0);
    document.getElementById("gifSize").value = parseInt(document.getElementById("gifSize").value).toString();
});
document.getElementById("fontSizeSlider").addEventListener("change", evt => {
    sliderToText(evt.target.value, "fontSize", 2);
    tags.tagSingleFile();
});
document.getElementById("gifSpeedSlider").addEventListener("change", evt => {
    sliderToText(evt.target.value, "gifSpeed", 2);
});
document.getElementById("vertDisplacement").addEventListener("change", evt => {
    textToSlider(evt, "vertDisplacement", "vertDisplacementSlider", "vertDisplacement");
    tags.tagSingleFile();
});
document.getElementById("gifSize").addEventListener("change", evt => {
    textToSlider(evt, "gifSize", "gifSizeSlider", "gifSize");
});
document.getElementById("fontSize").addEventListener("change", evt => {
    textToSlider(evt, "fontSize", "fontSizeSlider", "fontSize");
    tags.tagSingleFile();
});
document.getElementById("gifSpeed").addEventListener("change", evt => {
    textToSlider(evt, "gifSpeed", "gifSpeedSlider", "gifSpeed");
});
document.getElementById("days").addEventListener("change", evt => {
    textToSlider(evt, "days", "daysSlider", "days");
});
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
    stopTag = true;
};
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
    let v = sliderFromVal(parseFloat(evt.target.value), limits[sliderID]);
    if (checkValid(v >= 0 && v <= 100, textID)) {
        gSettings[textID] = parseFloat(evt.target.value);
        document.getElementById(sliderID).value = v;
        localStorage.setItem(textID, gSettings[textID]);
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
}
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
/***
 * Set all the buttons in the notRunningList to enabled.
 * Set all the buttons in the runningList to disabled.
 * 
 */
async function enableButtons() {
    notRunningList.forEach((btn) => enableButton(btn));
    runningList.forEach((btn) => disableButton(btn));
    document.getElementById("status").innerHTML = "";
    document.getElementById("status2").innerHTML = "";

    stopTag = false;
    await progressBar(0);
}
/**
*  Set all the buttons in the notRunningList to disabled'
 * Set all the buttons in the runningList to enabled.
 * 
 * @param {*} str 
 */
async function disableButtons(str) {
    notRunningList.forEach((btn) => disableButton(btn));
    runningList.forEach((btn) => enableButton(btn));
    document.getElementById("status").innerHTML = str;
    document.getElementById("status2").innerHTML = str;
    await progressBar(0);
    stopTag = false;
}

/**
 * Given a value, compute a slider (0,100) setting from the value
 * @param {*} val 
 * @param {*} valRange 
 * @returns slider number, can be outside of the range
 */
function sliderFromVal(val, valRange) {
    return (val - valRange.minR) * 100 / (valRange.maxR - valRange.minR);
};

/** Convert a slider value to a text value truncated to two decimal places
 * and set the value in the textField
 *  
 * @param {*} sliderValue 
 * @param {*} textID the string value key in the limits directory that describes the slider right and left bounds
 */
function sliderToText(sliderValue, textID, nPlaces) {
    const sliderID = textID + "Slider";
    let lmts = limits[sliderID];
    gSettings[textID] = (sliderValue / 100) * (lmts.maxR - lmts.minR) + lmts.minR;
    document.getElementById(textID).value = gSettings[textID].toFixed(nPlaces); // two decimals
    localStorage.setItem(textID, gSettings[textID]);
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

/** set the value of the progress bar slider, 0 = left, 100 = right
 * 
 * @param {*} val 
 */
async function progressBar(val) {
    var lastVal = 0;
    if (val === lastVal) return; // limit number of calls and timeouts
    lastVal = val;
    document.getElementById("progressBar").value = val;
    document.getElementById("progressBar2").value = val;


    await new Promise(r => setTimeout(r, 10));    // a slight break is need to draw the progressbar  

}


