
// copywrite 2023 Richard R. Lyman

const { makeHelpDialogs } = require("./tagHelp.js");
const { setForeground, setBackground } = require("./tagBatchPlay.js");
const { displayDictionary } = require("./tagAddLayer.js");
const { tagSingleFile, tagMultiFiles, tagBatchFiles } = require("./tagFace.js");
const { gifBatchFiles, createIndex } = require("./tagGif.js");


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
const gifSuffix = "-gifs";
const labeledSuffix = "-labeled";
let filterKeyword = "";

let originalPhotosFolder=null;

restorePersistentData();
console.log(displayDictionary("restorePersistent ", gSettings));

gSettings.charsPerFace = 10;  // not currently adjustable

document.getElementById("merge").checked = gSettings.merge ? 1 : 0;
document.getElementById("backStroke").checked = gSettings.backStroke ? 1 : 0;
document.getElementById("outputMode").value = gSettings.outputMode;
document.getElementById("rb0").checked = gSettings.outputMode == 0 ? 1 : 0;
document.getElementById("rb1").checked = gSettings.outputMode == 1 ? 1 : 0;
document.getElementById("rb2").checked = gSettings.outputMode == 2 ? 1 : 0;

enableButtons(); // also sets sliders

console.log(displayDictionary("after enable ", gSettings));
let dialogs = new Array();

document.getElementById("btnOne").addEventListener("click", () => {
    if (gSettings.outputMode < 2) 
    tagSingle();
    else 
    createIndex();
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
    gSettings.outputMode = parseInt(evt.target.value);
    localStorage.setItem("outputMode", gSettings.outputMode);
    //tagSingle();
    enableButtons();

});
document.getElementById("text1").addEventListener("input", evt => {
    if (gSettings.outputMode < 2) {
        gSettings.vertDisplacement = parseFloat(evt.target.value);
        document.getElementById("slider1").value = (-50 / 3) * gSettings.vertDisplacement + (50 * 3.8 / 3);
        localStorage.setItem("vertDisplacement", gSettings.vertDisplacement);
        tagSingle();
    } else {
        gSettings.gifSize = parseInt(evt.target.value);
        document.getElementById("slider1").value = gSettings.gifSize / 40;
        localStorage.setItem("gifSize", gSettings.gifSize);

    }
});
document.getElementById("text2").addEventListener("input", evt => {
    if (gSettings.outputMode < 2) {
        gSettings.fontSize = parseFloat(evt.target.value);
        document.getElementById("slider2").value = (50 / .8) * gSettings.fontSize + (-0.2 * 50 / 0.8);
        localStorage.setItem("fontSize", gSettings.fontSize);
        tagSingle();
    } else {
        gSettings.gifSpeed = parseFloat(evt.target.value);
        document.getElementById("slider2").value = gSettings.gifSize * 10;
        localStorage.setItem("gifSpeed", gSettings.gifSpeed);

    }
});

document.getElementById("dropMenu").addEventListener("change", evt => {

  filterKeyword = evt.target.value;
  document.getElementById("dropDown").value = filterKeyword;
// Get the dropdown element
/* const dropdown =  document.getElementById("dropDown");

// Get the text input element
const textInput = document.getElementById('textfield1');

// Change the text
textInput.value = filterKeyword;

// Update the dropdown
//dropdown.update();   */    
});

function tagSingle() {
    if (gSettings.outputMode < 2)
        tagSingleFile();
}

function tagMulti() {
    if (gSettings.outputMode < 2)
        tagMultiFiles();

}

function tagBatch() {
    if (gSettings.outputMode < 2)
        tagBatchFiles(null, null);
    else
        gifBatchFiles();

}
document.getElementById("btnForeground")
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
document.getElementById("slider1").addEventListener("change", evt => {
    if (gSettings.outputMode < 2) {
        gSettings.vertDisplacement = (evt.target.value - (50 * 3.8 / 3)) / (-50 / 3);
        document.getElementById("text1").value = gSettings.vertDisplacement.toString();
        localStorage.setItem("vertDisplacement", gSettings.vertDisplacement);
        tagSingle();
    } else {
        gSettings.gifSize = Math.max(10, 40 * parseInt(evt.target.value));
        document.getElementById("text1").value = gSettings.gifSize.toString();
        localStorage.setItem("gifSize", gSettings.gifSize);
    }
});
document.getElementById("slider2").addEventListener("change", evt => {
    if (gSettings.outputMode < 2) {
        gSettings.fontSize = (evt.target.value - (-0.2 * 50 / 0.8)) / (50 / .8);
        document.getElementById("text2").value = gSettings.fontSize.toString();
        localStorage.setItem("fontSize", gSettings.fontSize);
        tagSingle();
    } else {
        gSettings.gifSpeed = (parseFloat(evt.target.value) / 10);
        document.getElementById("text2").value = gSettings.gifSpeed.toString();
        localStorage.setItem("gifSpeed", gSettings.gifSpeed);
    }
});

// load  persistent data

function restorePersistentData() {
    //localStorage.clear();
    gSettings.vertDisplacement = parseFloat(localStorage.getItem("vertDisplacement") || .8);
    gSettings.merge = (localStorage.getItem("merge") || "true") == "true";
    gSettings.backStroke = (localStorage.getItem("backStroke") || "true") == "true";
    gSettings.outputMode = parseInt((localStorage.getItem("outputMode")) || 0);
    gSettings.fontSize = parseFloat(localStorage.getItem("fontSize") || 1.0);
    gSettings.gifSpeed = parseFloat((localStorage.getItem("gifSpeed")) || .5);
    gSettings.gifSize = parseInt(localStorage.getItem("gifSize") || 300);

    // SolidColors are stored as a hexValue string.
    const SolidColor = require("photoshop").app.SolidColor;
    gSettings.foreColor = new SolidColor();
    gSettings.foreColor.rgb.hexValue = localStorage.getItem("foreColor") || "0xffffff";
    gSettings.backColor = new SolidColor();
    gSettings.backColor.rgb.hexValue = localStorage.getItem("backColor") || "0x0000ff";
    console.log(displayDictionary('gSettings', gSettings));

}
function enableButton(str) {
    console.log(str);
    document.getElementById(str).removeAttribute("disabled");
};
function disableButton(str) {
    document.getElementById(str).setAttribute("disabled", "true");
};

function enableButtons() {

    console.log(displayDictionary("enableButtons enter ", gSettings));
    let l1 = document.getElementById("label1");
    let l2 = document.getElementById("label2");
    let b1 = document.getElementById("btnOne");
    let b2 = document.getElementById("btnBatch");
    if (gSettings.outputMode < 2) {
        enableButton("merge");
        enableButton("backStroke");
        enableButton("btnForeground");
        enableButton("btnBackground");
        disableButton("label0");
        disableButton("dropDown");
        enableButton("btnMany");
        l1.innerHTML = "Vertical Position";
        l2.innerHTML = "Font Size";
        b1.innerHTML = "Refresh";
        b2.innerHTML = "Folders";
        document.getElementById("slider1").value = (-50 / 3) * gSettings.vertDisplacement + (50 * 3.8 / 3);
        document.getElementById("slider2").value = (50 / .8) * gSettings.fontSize + (-0.2 * 50 / 0.8);
        document.getElementById("text1").value = gSettings.vertDisplacement.toString();
        document.getElementById("text2").value = gSettings.fontSize.toString();
    } else {
        disableButton("merge");
        disableButton("backStroke");
        disableButton("btnForeground");
        disableButton("btnBackground");
        enableButton("label0");
        enableButton("dropDown");
        disableButton("btnMany");
        l1.innerHTML = "Gif Size";
        l2.innerHTML = "Gif Speed";
        b1.innerHTML = "Index" ;  
        b2.innerHTML = "Make"     
        document.getElementById("slider1").value = gSettings.gifSize / 40;
        document.getElementById("slider2").value = gSettings.gifSpeed * 10
        document.getElementById("text1").value = gSettings.gifSize.toString();
        document.getElementById("text2").value = gSettings.gifSpeed.toString();
    }
    enableButton("btnOne");
    enableButton("slider1");
    enableButton("slider2");
    enableButton("btnBatch");
    disableButton("btnStop");
    enableButton("rb0");
    enableButton("rb1");
    enableButton("rb2");
    enableButton("btnHelp");

    stopTag = false;
    console.log(displayDictionary("enableButtons exit ", gSettings));
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
    document.getElementById("slider1").setAttribute("disabled", "true");
    document.getElementById("slider2").setAttribute("disabled", "true");
    document.getElementById("btnForeground").setAttribute("disabled", "true");
    document.getElementById("btnBackground").setAttribute("disabled", "true");
    stopTag = false;
}




makeHelpDialogs();

