
// copywrite 2023 Richard R. Lyman

const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground } = require("./tagBatchPlay.js");
const { displayDictionary } = require("./tagAddLayer.js");
const { tagSingleFile, tagMultiFiles, tagBatchFiles } = require("./tagFace.js");
const { gifBatchFiles } = require("./tagGif.js");
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
* }}
*/
let gSettings = {};
let stopTag = false;
const gifSuffix = "-Gifs";
const labeledSuffix = "-labeled";

restorePersistentData();
gSettings.charsPerFace = 10;  // not currently adjustable

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("outputMode").value = gSettings.outputMode;
document.getElementById("vSlider").value = (-50 / 3) * gSettings.vertDisplacement + (50 * 3.8 / 3);
document.getElementById("fSlider").value = (50 / .8) * gSettings.fontSize + (-0.2 * 50 / 0.8);

let dialogs = new Array();

document.getElementById("btnOne").addEventListener("click", () => {
    tagSingle();
});
document.getElementById("btnMany").addEventListener("click", () => {
    tagMulti();
});
document.getElementById("btnBatch").addEventListener("click", () => {
    tagBatch(null, null);
});
document.getElementById("btnHelp").addEventListener("click", () => {
    dialogs[0].uxpShowModal();
});
document.getElementById("merge").addEventListener("change", evt => {
    gSettings.merge = evt.target.checked;
    localStorage.setItem("merge", gSettings.merge.toString());
    tagSingle();
});
document.getElementById("backStroke").addEventListener("change", evt => {
    gSettings.backStroke = evt.target.checked;
    localStorage.setItem("backStroke", gSettings.backStroke.toString());
    tagSingle();
});

document.getElementById("outputMode").addEventListener("change", evt => {
    console.log(`Selected item: ${evt.target.value}`);
    gSettings.outputMode = evt.target.value;
    //tagSingle();
    enableOutputMode();

});
function tagSingle() {
    if (gSettings.outputMode < 2 ) 
        tagSingleFile();

}

function tagMulti() {
    if (gSettings.outputMode < 2 ) 
        tagMultiFiles();

}

function tagBatch()
{
if (gSettings.outputMode < 2 ) 
    tagBatchFiles(null,null);
else
gifBatchFiles(null);

}

document.getElementById("btnForeground").addEventListener("click", evt => {
    setForeground();
    console.log(displayDictionary('gSettings foreColorX', gSettings));
    localStorage.setItem("foreColor", gSettings.foreColor.rgb.hexValue);
    console.log(displayDictionary('gSettings foreColor', gSettings));
    tagSingle();
});
document.getElementById("btnBackground").addEventListener("click", evt => {
    setBackground();
    localStorage.setItem("backColor", gSettings.backColor.rgb.hexValue);
    tagSingle();
});
document.getElementById("btnStop").addEventListener("click", evt => {
    console.log("stop button click");
    enableButtons();        // this might cure lockup  when moving panel during facetags
    stopTag = true;
});
document.getElementById("vSlider").addEventListener("change", evt => {
    gSettings.vertDisplacement = (evt.target.value - (50 * 3.8 / 3)) / (-50 / 3);
    localStorage.setItem("vertDisplacement", gSettings.vertDisplacement);
    tagSingle();
});
document.getElementById("fSlider").addEventListener("change", evt => {
    gSettings.fontSize = (evt.target.value - (-0.2 * 50 / 0.8)) / (50 / .8);
    localStorage.setItem("fontSize", gSettings.fontSize);
    tagSingle();
});

// load  persistent data

function restorePersistentData() {
    //localStorage.clear();
    gSettings.vertDisplacement = parseFloat(localStorage.getItem("vertDisplacement") || .8);
    gSettings.merge = (localStorage.getItem("merge") || "true") == "true";
    gSettings.backStroke = (localStorage.getItem("backStroke") || "true") == "true";
    gSettings.outputMode = parseInt((localStorage.getItem("outputMode")) || 0);
    gSettings.fontSize = parseFloat(localStorage.getItem("fontSize") || 1.0);

    // SolidColors are stored as a hexValue string.
    const SolidColor = require("photoshop").app.SolidColor;
    gSettings.foreColor = new SolidColor();
    gSettings.foreColor.rgb.hexValue = localStorage.getItem("foreColor") || "0xffffff";
    gSettings.backColor = new SolidColor();
    gSettings.backColor.rgb.hexValue = localStorage.getItem("backColor") || "0x0000ff";
    console.log(displayDictionary('gSettings', gSettings));

}

function enableOutputMode() {
    if (gSettings.outputMode < 2 ) {
        document.getElementById("merge").removeAttribute("disabled");
        document.getElementById("backStroke").removeAttribute("disabled");
        document.getElementById("btnForeground").removeAttribute("disabled");
        document.getElementById("btnBackground").removeAttribute("disabled");
        document.getElementById("btnMany").removeAttribute("disabled");
        document.getElementById("btnBatch").removeAttribute("disabled");
        document.getElementById("btnOne").removeAttribute("disabled");
        
    } else {
        document.getElementById("merge").setAttribute("disabled", "true");
        document.getElementById("backStroke").setAttribute("disabled", "true");
        document.getElementById("btnForeground").setAttribute("disabled", "true");
        document.getElementById("btnBackground").setAttribute("disabled", "true");
        document.getElementById("btnOne").setAttribute("disabled", "true");    
        document.getElementById("btnMany").setAttribute("disabled", "true");            
    }
}

function disableButtons() {
    document.getElementById("btnStop").removeAttribute("disabled");
    document.getElementById("btnMany").setAttribute("disabled", "true");
    document.getElementById("btnBatch").setAttribute("disabled", "true");
    document.getElementById("btnOne").setAttribute("disabled", "true");
    document.getElementById("rb0").setAttribute("disabled", "true");
    document.getElementById("rb1").setAttribute("disabled", "true");
    document.getElementById("rb2").setAttribute("disabled", "true");
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
    document.getElementById("rb0").removeAttribute("disabled");
    document.getElementById("rb1").removeAttribute("disabled");
    document.getElementById("rb2").removeAttribute("disabled");
    enableOutputMode();
    document.getElementById("btnHelp").removeAttribute("disabled");
    document.getElementById("vSlider").removeAttribute("disabled");
    document.getElementById("fSlider").removeAttribute("disabled");

    stopTag = false;
}


makeHelpDialogs();

