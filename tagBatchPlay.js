
// copywrite 2023 Richard R. Lyman
// Post Processing: add a background around the text for more readability

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

// get foreground and background colors for the face tags

function RGBFloatToSolid(rgbFloat) {
    const SolidColor = require("photoshop").app.SolidColor;
    let cl = new SolidColor();
    cl.rgb.red = rgbFloat.RGBFloatColor.red;
    cl.rgb.green = rgbFloat.RGBFloatColor.grain;
    cl.rgb.blue = rgbFloat.RGBFloatColor.blue;
    return cl;
};

//var resultOfPicker;

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

async function setForeground() {
    let resultOfPicker = await require("photoshop").core.executeAsModal(() => setForeground_actn("Pick Name Tag Foreground Color", gSettings.foreColor), { "commandName": "Set Foreground" });
     gSettings.foreColor = RGBFloatToSolid(resultOfPicker[0]);
}

async function setBackground() {
    let resultOfPicker = await require("photoshop").core.executeAsModal(() => setForeground_actn("Pick Name Tag Background Color", gSettings.backColor), { "commandName": "Set Background" });
    gSettings.backColor = RGBFloatToSolid(resultOfPicker[0]);
}
module.exports = {
    setForeground, setBackground, setOutsideStroke
};