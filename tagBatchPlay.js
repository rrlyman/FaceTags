
// copywrite 2023 Richard R. Lyman

/** Post Processing: add a background around the text for more readability
 * 
 * @param {*} gSettings dictionnary containing global settings
 * @returns Promise
 */

async function setOutsideStroke(gSettings) {
    const { executeAsModal } = require("photoshop").core;
    await executeAsModal(() => setOutsideStroke_actn(gSettings), { "commandName": "Adding Effect" });
};

async function setOutsideStroke_actn(gSettings) {
    const app = require('photoshop').app;
    const { batchPlay } = require("photoshop").action;

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
    return cl;
};

/**
 * Execute a batchPlay command to pick up the label text color
 * @param {string} panelTitle 
 * @param {SolidColor} startColor The previous text color
 * @returns Promise containing the RGBFloatColor picked from the Photoshop color picker
 */
async function setForeground_actn(panelTitle, startColor) {
    let psAction = require("photoshop").action;
    const openPicker =
        [
            {
                _target: { _ref: "application" },
                _obj: "showColorPicker",
                context: panelTitle,
                color: {
                    _obj: 'RGBColor',
                    red: startColor.rgb.red,
                    green: startColor.rgb.green,
                    blue: startColor.rgb.blue,
                },
            }
        ];

    return await psAction.batchPlay(openPicker, { synchronousExecution: true });
}

/**
 * Pick up the text color for the label and put it in gSettings
 */
async function setForeground() {
    let resultOfPicker = await require("photoshop").core.executeAsModal(() => setForeground_actn("Pick Name Tag Foreground Color", gSettings.foreColor), { "commandName": "Set Foreground" });
    gSettings.foreColor = RGBFloatToSolid(resultOfPicker[0]);
}
/**
 * Pick up the background border color for the label and put it in gSettings
 */
async function setBackground() {
    let resultOfPicker = await require("photoshop").core.executeAsModal(() => setForeground_actn("Pick Name Tag Border Color", gSettings.backColor), { "commandName": "Set Background" });
    gSettings.backColor = RGBFloatToSolid(resultOfPicker[0]);
}


/**
 * picks up the metadata of the currently loaded photo in Photoshop
 * @returns text buffer containing the metadata
 */
const getDocumentXMP = () => {
    const bp = require("photoshop").action.batchPlay;
    return bp(
        [
            {
                _obj: "get",
                _target: {
                    _ref: [
                        { _property: "XMPMetadataAsUTF8" },
                        { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                    ],
                },
            },
        ],
        { synchronousExecution: true }
    )[0].XMPMetadataAsUTF8;
};

module.exports = {
    setForeground, setBackground, setOutsideStroke, getDocumentXMP
};

