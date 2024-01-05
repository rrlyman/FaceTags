


// copywrite 2023 Richard R. Lyman



/** Post Processing: add a background around the text for more readability
 * 
 * @returns Promise
 */

async function setOutsideStroke() {
   await xModal(setOutsideStroke_actn, { "commandName": "Adding Background Effect" });
};

async function setOutsideStroke_actn() {
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
   let cl = new SolidColor();
   cl.rgb.red = rgbFloat.RGBFloatColor.red;
   cl.rgb.green = rgbFloat.RGBFloatColor.grain;
   cl.rgb.blue = rgbFloat.RGBFloatColor.blue;
   return cl;
};

/**
 * Execute a batchPlay command to pick up the label text color
 * @param {string} panelTitle 
 * @param {SolidColor} startColor The previous text color
 * @returns Promise containing the RGBFloatColor picked from the Photoshop color picker
 */
async function setColor_actn(panelTitle, startColor) {
   let resultOfPicker = await batchPlay(
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
      { synchronousExecution: true }
   );
   return resultOfPicker;
};


/**
 * Pick up the text color for the label and put it in gSettings
 */

async function setForeground() {
   resultOfPicker = await xModal(() => setColor_actn("Pick Text Foreground Color", gSettings.foreColor), { "commandName": "Pick Name Tag Foreground Color" });
   gSettings.foreColor = RGBFloatToSolid(resultOfPicker[0]);
   console.log("6");
};
/**
 * Pick up the background border color for the label and put it in gSettings
 */
async function setBackground() {
   resultOfPicker = await xModal(() => setColor_actn("Pick Text Background Color", gSettings.backColor), { "commandName": "Pick Name Tag Background Color" });
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
   await xModal(selectBackgroundLayer_actn, { "commandName": "selectBackgroundLayer" });
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
   await xModal(copyBackGroundLayer_actn, { "commandName": "copyBackGroundLayer" });
};




// async function reduceBrightness_actn() {
//    const result = await batchPlay(
//       [
//          {
//             _obj: "make",
//             _target: [
//                {
//                   _ref: "adjustmentLayer"
//                }
//             ],
//             using: {
//                _obj: "adjustmentLayer",
//                type: {
//                   _obj: "brightnessEvent",
//                   useLegacy: false
//                }
//             },
//             _options: {
//                dialogOptions: "dontDisplay"
//             }
//          }
//       ],
//       {}
//    );
// }

// async function reduceBrightness() {
//    await xModal(reduceBrightness_actn, { "commandName": "reduceBrightness" });
// }


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
   await xModal(reduceOpacity_actn, { "commandName": "reduceOpacity" });
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
   await xModal(addSelectFaceTags_actn, { "commandName": "addSelectFaceTags" });
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
   await xModal(() => makeAnArtboard_actn(dWidth, dHeight), { "commandName": "Action Commands" });
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
   await xModal(selectBackgroundCopy_actn, { "commandName": "selectBackgroundCopy" });
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
   await xModal(() => moveGrayImage_actn(dHeight), { "commandName": "moveGrayImages" });
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
   await xModal(linkLayers_actn, { "commandName": "linkLayers" });
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
   await xModal(blackAndWhite_actn, { "commandName": "blackAndWhite" });
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
   await xModal(trim_actn, { "commandName": "trim" });
}
// Events recognized as notifiers are not re-playable in most of the cases. There is high chance that generated code won't work.


async function selectMoveTool_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "select",
            _target: [
               {
                  _ref: "zoomTool"
               }
            ],
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function selectMoveTool() {
   await xModal(selectMoveTool_actn, { "commandName": "selectMoveTool" });
}
// make background from layer

async function backgroundFromLayer_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "make",
            _target: [
               {
                  _ref: "backgroundLayer"
               }
            ],
            using: {
               _ref: "layer",
               _enum: "ordinal",
               _value: "targetEnum"
            },
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function backgroundFromLayer() {
   await xModal(backgroundFromLayer_actn, { "commandName": "backgroundFromLayer" });
}


async function brightnessAndContrast_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "brightnessEvent",
            brightness: 57,
            center: -50,
            useLegacy: false,
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function brightnessAndContrast() {
   await xModal(brightnessAndContrast_actn, { "commandName": "brightnessAndContrast" });
}


/**
 * When called, a landscape mode face tagged version of the photo has been created.  The text is in the FaceTags group
 * Make an artboard, twice as tall as the original photo, containing the original photo on the top half
 * and a dimly gray version of the photo ont he bottom half with the Person names on each person
 * @param {*} aDoc 
 */

async function makeAPortrait(aDoc) {
   let dWidth = aDoc.width;
   let dHeight = aDoc.height;
   // at this point there are two layers, the background layer and the FaceTags Group with text
   await selectBackgroundLayer();  // the selection was on Facetags, move selection to the background
   await copyBackGroundLayer();    // make a background copy layer
   await reduceOpacity();          // this reduces the opacity of the 'background copy' layer
   await addSelectFaceTags();      // adds to the 'background copy' selection the facetags so two layers are selected
   await linkLayers();            // links the selected layers: 'background copy' and Facetags
   await makeAnArtboard(dWidth, dHeight);
   await selectBackgroundCopy();   // selects the linked layers
   await moveGrayImage(dHeight);   // move increases artboard height and moves the facetagged images to the bottom of the artboard
   await trim();   // get rid extra space at the bottom
};

module.exports = {
   setForeground, setBackground, setOutsideStroke, makeAPortrait, trim, selectMoveTool
};

