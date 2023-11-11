
// copywrite 2023 Richard R. Lyman

const { displayDictionary } = require('./tagAddLayer');


// Events recognized as notifiers are not re-playable in most of the cases. There is high chance that generated code won't work.


async function newDocumentFromHistory_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "make",
            _target: [
               {
                  _ref: "document"
               }
            ],
            using: {
               _ref: "historyState",
               _property: "currentHistoryState"
            },
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function newDocumentFromHistory() {
   await executeAsModal(newDocumentFromHistory_actn, {"commandName": "Action Commands"});
}



/** Post Processing: add a background around the text for more readability
 * 
 * @param {*} gSettings dictionnary containing global settings
 * @returns Promise
 */

async function setOutsideStroke(gSettings) {
      await executeAsModal(() => setOutsideStroke_actn(gSettings), { "commandName": "Adding Effect" });
};

async function setOutsideStroke_actn(gSettings) {
    const app = require('photoshop').app;

    const result = await batchPlay(
        [
            {
                _obj: "select",
                _target: [
                    {
                        _ref: "layer",
                        _name: "FaceTags"
                    }
                ],
                makeVisible: false,
                layerID: [
                    37
                ],
                _options: {
                    dialogOptions: "dontDisplay"
                }
            },
            {

                _obj: "set",
                _target: [
                    {
                        _ref: "property",
                        _property: "layerEffects"
                    },
                    {
                        _ref: "layer",
                        _enum: "ordinal",
                        _value: "targetEnum"
                    }
                ],
                to: {
                    _obj: "layerEffects",
                    scale: {
                        _unit: "percentUnit",
                        _value: 416.6666666666667
                    },
                    frameFX: {
                        _obj: "frameFX",
                        enabled: true,
                        present: true,
                        showInDialog: true,
                        style: {
                            _enum: "frameStyle",
                            _value: "outsetFrame"
                        },
                        paintType: {
                            _enum: "frameFill",
                            _value: "solidColor"
                        },
                        mode: {
                            _enum: "blendMode",
                            _value: "normal"
                        },
                        opacity: {
                            _unit: "percentUnit",
                            _value: 100
                        },
                        size: {
                            _unit: "pixelsUnit",
                            _value: 3
                        },
                        color: {
                            _obj: "RGBColor",
                            red: gSettings.backColor.rgb.red,
                            grain: gSettings.backColor.rgb.green,
                            blue: gSettings.backColor.rgb.blue
                        },
                        overprint: false
                    }
                },
                _options: {
                    dialogOptions: "dontDisplay"
                }
            }
        ],
        {}
    );

};


/**
 * Convert from RGBFloatColor class to SolidColor
 * 
 * @param {RGBFloatColor} rgbFloat 
 * @returns SolidColor
 */
function RGBFloatToSolid(rgbFloat) {
    const SolidColor = require("photoshop").app.SolidColor;
    let cl = new SolidColor();
    cl.rgb.red = rgbFloat.RGBFloatColor.red;
    cl.rgb.green = rgbFloat.RGBFloatColor.grain;
    cl.rgb.blue = rgbFloat.RGBFloatColor.blue;
    console.log(cl.rgb.hexValue);
    return cl;
};

var resultOfPicker;
/**
 * Execute a batchPlay command to pick up the label text color
 * @param {string} panelTitle 
 * @param {SolidColor} startColor The previous text color
 * @returns Promise containing the RGBFloatColor picked from the Photoshop color picker
 */
 async function setColor_actn(panelTitle, startColor) {
   resultOfPicker = await batchPlay(
         [
            {
                  _target: { _ref: "application" },
                  _obj: "showColorPicker",
                  context: panelTitle,
                  color: {
                     _obj: 'RGBColor', 
                      red: startColor.rgb.red,
                      grain: startColor.rgb.green,
                      blue: startColor.rgb.blue
                  }
            }
      ],
      {synchronousExecution: true}
   );
   return resultOfPicker;
};


/**
 * Pick up the text color for the label and put it in gSettings
 */

async function setForeground() {
   await executeAsModal(() => setColor_actn("Pick Text Foreground Color", gSettings.foreColor), {"commandName": "Pick Name Tag Foreground Color"});
   gSettings.foreColor = RGBFloatToSolid(resultOfPicker[0]);
};
/**
 * Pick up the background border color for the label and put it in gSettings
 */
async function setBackground() {
   await executeAsModal(() => setColor_actn("Pick Text Background Color",gSettings.backColor), {"commandName": "Pick Name Tag Background Color"});
   gSettings.backColor = RGBFloatToSolid(resultOfPicker[0]);
};


async function selectBackgroundLayer_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "select",
            _target: [
               {
                  _ref: "layer",
                  _name: "Background"
               }
            ],
            makeVisible: false,
            layerID: [
               1
            ],
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
};

async function selectBackgroundLayer() {
   await executeAsModal(selectBackgroundLayer_actn, {"commandName": "Action Commands"});
};


async function copyBackGroundLayer_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "copyToLayer",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
};

async function copyBackGroundLayer() {
   await executeAsModal(copyBackGroundLayer_actn, {"commandName": "Action Commands"});
};



async function reduceOpacity_actn() {
    const result = await batchPlay(
       [
          {
             _obj: "set",
             _target: [
                {
                   _ref: "layer",
                   _enum: "ordinal",
                   _value: "targetEnum"
                }
             ],
             to: {
                _obj: "layer",
                opacity: {
                   _unit: "percentUnit",
                   _value: 25
                }
             },
             _options: {
                dialogOptions: "dontDisplay"
             }
          }
       ],
       {}
    );
 };
 
 async function reduceOpacity() {
    await executeAsModal(reduceOpacity_actn, {"commandName": "Action Commands"});
 };

 
async function addSelectFaceTags_actn() {
    const result = await batchPlay(
       [
          {
             _obj: "select",
             _target: [
                {
                   _ref: "layer",
                   _name: "FaceTags"
                }
             ],
             makeVisible: false,
             selectionModifier: {
               _enum: "selectionModifierType",
               _value: "addToSelection"
            },
             layerID: [
                2
             ],
             _options: {
                dialogOptions: "dontDisplay"
             }
          }
       ],
       {}
    );
 };
 
 async function addSelectFaceTags() {
    await executeAsModal(addSelectFaceTags_actn, {"commandName": "Action Commands"});
 };


async function makeAnArtboard_actn(dWidth, dHeight) {
    const result = await batchPlay(
       [
          {
             _obj: "make",
             _target: [
                {
                   _ref: "artboardSection"
                }
             ],
             from: {
                _ref: "layer",
                _enum: "ordinal",
                _value: "targetEnum"
             },
             layerSectionStart: 36,
             layerSectionEnd: 37,
             name: "Artboard 1",
             artboardRect: {
                _obj: "classFloatRect",
                top: 0,
                left: 0,
                bottom: dHeight,
                right: dWidth
             },
             _options: {
                dialogOptions: "dontDisplay"
             }
          }
       ],
       {}
    );
 };

 async function makeAnArtboard(dWidth, dHeight) {
    await executeAsModal(() => makeAnArtboard_actn(dWidth, dHeight), {"commandName": "Action Commands"});
 };
 
 
async function selectBackgroundCopy_actn() {
    const result = await batchPlay(
       [
          {
             _obj: "select",
             _target: [
                {
                   _ref: "layer",
                   _name: "Background copy"
                }
             ],
             makeVisible: false,
             layerID: [
                37
             ],
             _options: {
                dialogOptions: "dontDisplay"
             }
          }
       ],
       {}
    );
 };
 
 async function selectBackgroundCopy() {
    await executeAsModal(selectBackgroundCopy_actn, {"commandName": "Action Commands"});
 };
 
async function moveGrayImage_actn(dHeight) {
    const result = await batchPlay(
       [
          {
             _obj: "move",
             _target: [
                {
                   _ref: "layer",
                   _enum: "ordinal",
                   _value: "targetEnum"
                }
             ],
             to: {
                _obj: "offset",
                horizontal: {
                   _unit: "pixelsUnit",
                   _value: 0
                },
                vertical: {
                   _unit: "pixelsUnit",
                   _value: dHeight
                }
             },
             _options: {
                dialogOptions: "dontDisplay"
             }
          }
       ],
       {}
    );
 };
 
 async function moveGrayImage(dHeight) {
    await executeAsModal(() => moveGrayImage_actn(dHeight), {"commandName": "Action Commands"});
 };
 
 // Events recognized as notifiers are not re-playable in most of the cases. There is high chance that generated code won't work.



async function linkLayers_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "linkSelectedLayers",
            _target: [
               {
                  _ref: "layer",
                  _enum: "ordinal",
                  _value: "targetEnum"
               }
            ],
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
};

async function linkLayers() {
   await executeAsModal(linkLayers_actn, {"commandName": "Action Commands"});
};
async function blackAndWhite_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "make",
            _target: [
               {
                  _ref: "adjustmentLayer"
               }
            ],
            using: {
               _obj: "adjustmentLayer",
               type: {
                  _obj: "blackAndWhite"
               }
            },
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function blackAndWhite() {
   await executeAsModal(blackAndWhite_actn, {"commandName": "Action Commands"});
}

// Events recognized as notifiers are not re-playable in most of the cases. There is high chance that generated code won't work.


async function trim_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "trim",
            trimBasedOn: {
               _enum: "trimBasedOn",
               _value: "bottomRightPixelColor"
            },
            top: false,
            bottom: true,
            left: false,
            right: false,
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function trim() {
   await executeAsModal(trim_actn, {"commandName": "Action Commands"});
}



/**
 * Make an artboard, twice as tall as the original photo, containing the original photo on the top half
 * and a dimly gray version of the photo ont he bottom half with the Person names on each person
 * @param {*} gDoc 
 */

 async function makeAPortrait(gDoc) {
    let dWidth = gDoc.width;
    let dHeight = gDoc.height;
    await selectBackgroundLayer();
    await copyBackGroundLayer();
    await reduceOpacity();  
   // await blackAndWhite();    
    await addSelectFaceTags();
    await linkLayers() ;
    await makeAnArtboard(dWidth, dHeight);
    await selectBackgroundCopy();
    await moveGrayImage(dHeight); // move increases artboard height
    await trim();   // get rid extra space at the bottom
};

module.exports = {
    setForeground, setBackground, setOutsideStroke,  makeAPortrait, newDocumentFromHistory, trim
};

