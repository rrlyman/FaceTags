
// copywrite 2023 Richard R. Lyman

const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground } = require("./tagBatchPlay.js");
const { displayDictionary } = require("./tagAddLayer.js");
const { tagSingleFile, tagMultiFiles, tagBatchFiles } = require("./tagFace.js");
const { gifBatchFiles, createIndex } = require("./tagGif.js");

// these never change so they can be global constants

const core = require('photoshop').core;
const { executeAsModal } = require("photoshop").core;
const SolidColor = require("photoshop").app.SolidColor;
const fs = require('uxp').storage.localFileSystem;
const { app, constants } = require("photoshop");
const { batchPlay } = require("photoshop").action;
const xmp = require("uxp").xmp;
const xmpEntry = require('uxp').storage.Entry;
const xmpConstants = require('uxp').xmp.XMPConst;
const imaging = require("photoshop").imaging;
/**
 * gSettings contains all the persistent preferences
* @type {
* gsettings {  
* vertDisplacement : number,
* backStroke : boolean,
* outputMode : number,  
* fontSize  : number,
* foreColor: SolidColor,
* backColor SolidColor,
* charsPerFace : number,
* days: number
* }}
*/
let gSettings = {};
let stopTag = false;
const gifSuffix = "-gifs";
const labeledSuffix = "-labeled";
let filterKeyword = "";
let originalPhotosFolder = null;
const idList = ["rb0", "rb1", "rb2", "rb02", "rb12", "rb22",  "btnHelp", "btnHelp2","btnTagFile", "btnTagFolder", "tagRefreshBtn", "verticalPositionSlider", "fontSizeSlider", "btnForeground",
    "btnBackground", "keywordDropDown", "dropMenu", "gifSpeedText", "gifSizeText", "createIndex", "makeGIFs", "gifSizeSlider", "gifSpeedSlider","daysSlider"];


const limits = {
    gifSize: { minR: 10, maxR: 2160 },
    fontSize: { minR: .1, maxR: 3 },
    gifSpeed: { minR: 0, maxR: 20 },
    vertDisplacement: { minR: 3, maxR: -2 },
    days: { minR: 0, maxR: 1000 },
}
/**
 * given a value, compute a slider (0,100) setting from the value
 * @param {*} val 
 * @param {*} valRange 
 * @returns slider number, can be outside of the range
 */
function sliderFromVal(val, valRange) {
    return (val - valRange.minR) * 100 / (valRange.maxR - valRange.minR);
};

/** compute a text number from a slider position
 * 
 * @param {*} slider (0,100)
 * @param {*} valRange limits of the value for the textbox
 * @returns computer value from the slider position
 */
function valFromSlider(slider, valRange) {
    return (slider / 100) * (valRange.maxR - valRange.minR) + valRange.minR;
}
restorePersistentData();
console.log(displayDictionary("restorePersistent ", gSettings));
gSettings.charsPerFace = 10;  // not currently adjustable

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("outputMode").value = gSettings.outputMode;
document.getElementById("outputMode2").value = gSettings.outputMode;

function setOutputModeChecked() {
document.getElementById("rb0").checked = gSettings.outputMode == 0 ? 1 : 0;
document.getElementById("rb1").checked = gSettings.outputMode == 1 ? 1 : 0;
document.getElementById("rb2").checked = gSettings.outputMode == 2 ? 1 : 0;
document.getElementById("rb02").checked = gSettings.outputMode == 0 ? 1 : 0;
document.getElementById("rb12").checked = gSettings.outputMode == 1 ? 1 : 0;
document.getElementById("rb22").checked = gSettings.outputMode == 2 ? 1 : 0;
};

document.getElementById("keywordDropDown").value = filterKeyword;

document.getElementById("gifSpeedText").value = gSettings.gifSpeed.toString();
document.getElementById("gifSizeText").value = gSettings.gifSize.toString();
document.getElementById("fontSizeText").value = gSettings.fontSize.toString();
document.getElementById("verPosText").value = gSettings.vertDisplacement.toString();
document.getElementById("daysSlider").value = sliderFromVal(gSettings.days, limits.days);
document.getElementById("daysText").value = gSettings.days.toString();
document.getElementById("verticalPositionSlider").value = sliderFromVal(gSettings.vertDisplacement, limits.vertDisplacement);
document.getElementById("fontSizeSlider").value = sliderFromVal(gSettings.fontSize, limits.fontSize);
document.getElementById("gifSizeSlider").value = sliderFromVal(gSettings.gifSize, limits.gifSize);
document.getElementById("gifSpeedSlider").value = sliderFromVal(gSettings.gifSpeed, limits.gifSpeed);
enableButtons(); // also sets sliders

let dialogs = new Array();
setOutputModeChecked();

document.getElementById("tagRefreshBtn").addEventListener("click", () => {
    tagSingleFile();
});
document.getElementById("createIndex").addEventListener("click", () => {
    createIndex();
});
document.getElementById("btnTagFile").addEventListener("click", () => {
    tagMultiFiles();
});
document.getElementById("btnTagFolder").addEventListener("click", () => {
    tagBatchFiles(null, null);
});
document.getElementById("makeGIFs").addEventListener("click", () => {
    gifBatchFiles();
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
    tagSingleFile();;
});
document.getElementById("backStroke").addEventListener("change", evt => {
    gSettings.backStroke = evt.target.checked;
    localStorage.setItem("backStroke", gSettings.backStroke.toString());
    tagSingleFile();;
});

document.getElementById("outputMode").addEventListener("change", evt => {
    gSettings.outputMode = parseInt(evt.target.value);
    localStorage.setItem("outputMode", gSettings.outputMode);
    enableButtons();
    setOutputModeChecked();
    if (gSettings.outputMode < 2)
        tagSingleFile();
});
document.getElementById("outputMode2").addEventListener("change", evt => {
    gSettings.outputMode = parseInt(evt.target.value);
    localStorage.setItem("outputMode", gSettings.outputMode);
    enableButtons();
    setOutputModeChecked();
    if (gSettings.outputMode < 2)
        tagSingleFile();
});
function textToSlider(evt, textID, sliderID, param) {
    let v = sliderFromVal(parseFloat(evt.target.value), limits[param]);
    if (checkValid(v >= 0 && v <= 100, textID)) {
        gSettings[param] = parseFloat(evt.target.value);
        document.getElementById(sliderID).value = v;
        localStorage.setItem(param, gSettings[param]);
    }
};

function sliderToText(evt, textID, sliderID, param) {
    gSettings[param] = valFromSlider(evt.target.value, limits[param]);
    document.getElementById(textID).value = (parseInt(100*gSettings[param])/100).toString();
    localStorage.setItem(param, gSettings[param]);
};
document.getElementById("daysSlider").addEventListener("change", evt => {
    sliderToText(evt, "daysText", "daysSlider", "days");
 });
document.getElementById("verticalPositionSlider").addEventListener("change", evt => {
    sliderToText(evt, "verPosText", "verticalPositionSlider", "vertDisplacement");
    tagSingleFile();
});
document.getElementById("gifSizeSlider").addEventListener("change", evt => {
    sliderToText(evt, "gifSizeText", "gifSizeSlider", "gifSize");
    document.getElementById("gifSizeText").value = parseInt(document.getElementById("gifSizeText").value).toString();
});

document.getElementById("fontSizeSlider").addEventListener("change", evt => {
    sliderToText(evt, "fontSizeText", "fontSizeSlider", "fontSize");
    tagSingleFile();
});
document.getElementById("gifSpeedSlider").addEventListener("change", evt => {
    sliderToText(evt, "gifSpeedText", "gifSpeedSlider", "gifSpeed");
});

document.getElementById("verPosText").addEventListener("change", evt => {
    textToSlider(evt, "verPosText", "verticalPositionSlider", "vertDisplacement");
    tagSingleFile();
});
document.getElementById("gifSizeText").addEventListener("change", evt => {
    textToSlider(evt, "gifSizeText", "gifSizeSlider", "gifSize");
});

document.getElementById("fontSizeText").addEventListener("change", evt => {
    textToSlider(evt, "fontSizeText", "fontSizeSlider", "fontSize");
    tagSingleFile();
});
document.getElementById("gifSpeedText").addEventListener("change", evt => {
    textToSlider(evt, "gifSpeedText", "gifSpeedSlider", "gifSpeed");
});
document.getElementById("daysText").addEventListener("change", evt => {
    textToSlider(evt, "daysText", "daysSlider", "days");
});
document.getElementById("dropMenu").addEventListener("change", evt => {
    filterKeyword = evt.target.value;
    document.getElementById("keywordDropDown").value = filterKeyword;
});

document.getElementById("btnForeground").addEventListener("click", evt => {
    setForeground();
    console.log(displayDictionary('gSettings foreColorX', gSettings));
    localStorage.setItem("foreColor", gSettings.foreColor.rgb.hexValue);
    console.log(displayDictionary('gSettings foreColor', gSettings));
    tagSingleFile();;
});

document.getElementById("btnBackground").addEventListener("click", evt => {
    setBackground();
    localStorage.setItem("backColor", gSettings.backColor.rgb.hexValue);
    tagSingleFile();;
});

document.getElementById("btnStop").addEventListener("click", evt => {
    console.log("stop button click");
    enableButtons();        // this might cure lockup  when moving panel during facetags
    stopTag = true;
});

document.getElementById("btnStop2").addEventListener("click", evt => {
    console.log("stop button click");
    enableButtons();        // this might cure lockup  when moving panel during facetags
    stopTag = true;
});
/**
 * load persistent data from the localStorage
 */
function restorePersistentData() {
    //localStorage.clear();
    gSettings.vertDisplacement = parseFloat(localStorage.getItem("vertDisplacement") || .8);
    gSettings.merge = (localStorage.getItem("merge") || "true") == "true";
    gSettings.backStroke = (localStorage.getItem("backStroke") || "true") == "true";
    gSettings.outputMode = parseInt((localStorage.getItem("outputMode")) || 0);
    gSettings.fontSize = parseFloat(localStorage.getItem("fontSize") || 1.0);
    gSettings.gifSpeed = parseFloat((localStorage.getItem("gifSpeed")) || .5);
    gSettings.gifSize = parseInt(localStorage.getItem("gifSize") || 300);
    gSettings.days = parseFloat((localStorage.getItem("days")) || 1);

    // SolidColors are stored as a hexValue string.

    gSettings.foreColor = new SolidColor();
    gSettings.foreColor.rgb.hexValue = localStorage.getItem("foreColor") || "0xffffff";
    gSettings.backColor = new SolidColor();
    gSettings.backColor.rgb.hexValue = localStorage.getItem("backColor") || "0x0000ff";
    console.log(displayDictionary('gSettings', gSettings));

}

/**
 * If the condition is true, set the attributes to valid for the textBox,
 * If the condition is false, set the attributes of the texbox to invlid.
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

function enableButton(str) {
    console.log(str);
    document.getElementById(str).removeAttribute("disabled");

};
function disableButton(str) {
    document.getElementById(str).setAttribute("disabled", "true");
};

function enableButtons() { 
    if (gSettings.outputMode < 2) {
        document.getElementById("tags").className="sp-tab-page visible"    ;      
        document.getElementById("gifs").className="sp-tab-page "    ;   
      } else {
        document.getElementById("gifs").className="sp-tab-page visible"    ;     
        document.getElementById("tags").className="sp-tab-page "    ;  
    }
    
    stopTag = false;
    idList.forEach((btn) => enableButton(btn));
    disableButton("btnStop");
    disableButton("btnStop2");    
    // window.location.reload();  // this erases all settings in the html!
}

function disableButtons() {
    enableButton("btnStop");
    enableButton("btnStop2");    
    idList.forEach((btn) => disableButton(btn));
    stopTag = false;
}
//makeGifHelpDialogs();
makeHelpDialogs();



