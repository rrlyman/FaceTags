
// copywrite 2023-2024 Richard R. Lyman

const { errorLog, capitalize } = require("./tagUtils.js");
function isSameArea(mwgRect, mpRect) {

    for (let i = 0; i < 4; i++) {
        if ((mwgRect[i] < (mpRect[i] - .01)) || (mwgRect[i] > (mpRect[i] + .01))) {
            return false;
        }
    }
    return true;
};
function nmb(rect) {
    for (let i = 0; i < 4; i++) {

        rect[i] = Number(rect[i]);
        if (rect[i] == undefined || rect[i] == null) {
            return null;
        }
    }
    return rect;
};


function isNum(rect) {
    let isOK = true;
    for (let i = 0; i < 4; i++) {
        if (typeof rect[i] != "number") {
            return false;
        }
    }
    return true;
};


function isOK(x) {
    let ok = true;
    if (x == undefined || x == null)
        ok = false;
    else {
        x.forEach((t) => {
            if (t == undefined || t == null)
                ok = false;
        });
    }
    return ok;
}

function isRegionOK(rgn) {
    let ok = true;
    rgn.forEach((person) => {
        if (!isOK([person.name, person.rect, isOK(person.rect)]))
            ok = false;
    });
    return ok;
}

function isRegionsOK(rgns) {
    let ok = true;
    rgns.forEach((rgn) => {
        if (!isRegionOK(rgn))
            ok = false;
    });
    return rgns.length > 0;
}

const warn = [
    "If a Adobe region has a mwgRectangle but is missing a name but the Microsoft regions contains the identical mwgRectangle, then write over the Adobe region name with the name from Microsoft regions.",
    "If a Microsoft region has a mwgRectangle but is missing a name but the Adobe regions contains the identical mwgRectangle, then write over the Microsoft region name with the name from Adobe regions.",
    "If both Microsoft region and Adobe region have the same name, but the mwgRectangles are not identical, then replace the mwgRectangle in the Microsoft region with the one from the Adobe region.",
    "If an Adobe region has a name that does not appear in the Subject list, the add the name to the Subject list.",
    "If the Microsoft regions contains a name that is not in the mwpRegions and there are no identical mwgRectangles, the copy the Microsoft region to the Adobe regions."
];

function tagFile(nativePath) {
    const dotIndex = nativePath.lastIndexOf(".");
    let str = nativePath;
    str = "-m \"" + nativePath + "\"   ";
    return str;
}
function hasStr(xArray, str) {
    let hasIt = false
    xArray.forEach((x) => {
        if (x.toLowerCase() == str.toLowerCase()) hasIt = true;
    })
    return hasIt;
};
/**
 * 
 * @param {*} mwgRegions Array from mwg-rs:Regions
 * @param {*} subjects Array from dc:Subject
 * @param {*} mpRegions Array from Microsoft MP:RegionInfo
 * @returns html array of strings containing errors.
 */
function checkProperties(entry, mwgRegions, subjects, mpRegions) {

    /*
    things to check later
    After reading all of the photos, for each file, if there is a name in subject that is found in a list of all person names from the Adobe regions in all files, but it is not in the Adobe regions
    in the file, then delete it from the global subject list. 

*/
    let html = [];
    let cmd = [];
    let onlyOne = true;

    const mwgOK = isRegionOK(mwgRegions);
    const mpOK = isRegionOK(mpRegions);

    if (mwgOK && mpOK && mpRegions.length > 0) {
        errorLog(html, cmd,
            "WARNING 01: There are Microsoft regions but no Adobe regions. Copy all the valid Microsoft regions to the Adobe regions.",
            'exiftool -config facetags.config  -RegionInfo<MPRegion2MWGRegion ' + tagFile(entry.nativePath));

        if (mwgOK && !mpOK && mwgRegions.length > 0) {
            errorLog(html, cmd,
                "WARNING 02: There are Adobe regions but no Microsoft regions. Copy all the valid Adobe regions to the Microsoft regions.",
                'exiftool -config facetags.config  -RegionInfoMP<MWGRegion2MPRegion ' + tagFile(entry.nativePath));
        }
    }
    for (let i = mwgRegions.length - 1; i >= 0; i--) {
        const mwgRegion = mwgRegions[i];

        if (!isOK(mwgRegion.rect)) {

            if (mpOK) {
                errorLog(html, cmd,
                    "ERROR 01: \"" + mwgRegion.name + "\" is in an MWG RegionList but there is no x,y,w,h mwgRectangle information. Copy the person from the Microsoft Region",
                    'exiftool -config facetags.config  -RegionInfo<MPRegion2MWGRegion ' + tagFile(entry.nativePath));
            }
        }
        // I am deleting this for now because it is goo dangerous

        // if (!isOK([mwgRegion.name])) {
        //     errorLog(html, cmd, "WARNING 03: There is an MWG mwgRectangle, without a NAME in a MWG region. Delete the unnamed Area", "");

        //     // NOTE:  to remove an entire structure, remove each item in the structure.  The reason, the elements of the structure are presented
        //     // as a FLATTENED list, i.e. an array for each member of the schema 

        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionAreaW-<RegionAreaW   " + tagFile(entry.nativePath)");
        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionAreaH-<RegionAreaH   " + tagFile(entry.nativePath)");
        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionAreaX-<RegionAreaX   " + tagFile(entry.nativePath)");
        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionAreaY-<RegionAreaY   " + tagFile(entry.nativePath)");
        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionAreaW-<RegionAreaW   " + tagFile(entry.nativePath)");
        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionAreaUnit-<RegionAreaUnit   " + tagFile(entry.nativePath)");
        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionRotation-<RegionRotation   " + tagFile(entry.nativePath)");
        //     errorLog(html, cmd, "", "exiftool -listItem " + i + " -RegionType-<RegionType   " + tagFile(entry.nativePath)");

        // } else 
        if (isOK([mwgRegion.name]) && !hasStr(subjects, mwgRegion.name)) {

            errorLog(html, cmd,
                "WARNING 04: \"" + mwgRegion.name + "\" is in MWG mwgRectangle but is not in dc:subject. Copy the name to the keywords and Subject",
                "exiftool  -Keywords-=\"" + mwgRegion.name + "\" -Keywords+=\"" + mwgRegion.name + "\" " + tagFile(entry.nativePath));
            errorLog(html, cmd, "", "exiftool -Subject-=\"" + mwgRegion.name + "\"  -Subject+=\"" + mwgRegion.name + "\" " + tagFile(entry.nativePath));
        }


    };

    for (let x in mpRegions) {
        let mpRegion = mpRegions[x];
        let missingPerson = true;
        if (!isOK([mpRegion.rect]))
            continue;
        let mpRect = mpRegion.rect;
        mpRect = [mpRect[0] + (mpRect[2] / 2), mpRect[1] + (mpRect[3] / 2), mpRect[2], mpRect[3]];

        mwgRegions.forEach((mwgRegion) => {

            const mwgRect = nmb(mwgRegion.rect);

            if (mwgRect != null) {

                if ((mpRegion.name.toLowerCase() == mwgRegion.name.toLowerCase())) {
                    missingPerson = false;

                    if (!isSameArea(mwgRect, mpRect)) {
                        errorLog(html, cmd, "WARNING 05: The MP mwgRectangle " + JSON.stringify(mpRect) + " for person \"" + mwgRegion.name +
                            "\" does not line up with MWG mwgRectangle [" + JSON.stringify(mwgRect) + "]",
                            'exiftool -config facetags.config  \"-RegionInfoMP<MWGRegion2MPRegion\" ' + tagFile(entry.nativePath));

                    }
                }

                if ((mpRegion.name.toLowerCase() != mwgRegion.name.toLowerCase()) && isSameArea(mwgRect, mpRect)) {
                    // "If a Adobe region has a mwgRectangle but is missing a name but the Microsoft regions contains the identical mwgRectangle, then write over the Adobe region name with the name from Microsoft regions.",

                    errorLog(html, cmd,
                        "WARNING 06: The MP mwgRectangle " + JSON.stringify(mpRect) + " for mpRegion \"" + mpRegion.name + " " + JSON.stringify(mwgRect) +
                        "\" has a different name, " + mwgRegion.name + " in the MWGRegion. Transfer the name from the Adobe region to the Microsoft region.",
                        "exiftool   -RegionPersonDisplayName+=\"" + mwgRegion.name + "\" -RegionPersonDisplayName-=\"" + mpRegion.name + "\"  " + tagFile(entry.nativePath));

                    missingPerson = false; // because we may have fixed the missing person.
                }
            }
        }
        );

        if (missingPerson) {

            errorLog(html, cmd, "WARNING 07: Person, \"" + mpRegion.name + "\" is in Microsoft Region but not in MWG RegionList",
                'exiftool -config facetags.config  \"-RegionInfo<MPRegion2MWGRegion\" ' + tagFile(entry.nativePath));

        }
    }

    // subjects.forEach((subject) => {
    //     missingPerson = true;
    //     mwgRegions.forEach((mwgRegion) => {
    //         if (mwgRegion.name != undefined && mwgRegion.name == subject)
    //             missingPerson = false;
    //     });

    //     if (missingPerson && mwgRegions.length == 1 && mwgRegions[0].name == undefined) {

    //         errorLog(html, cmd, "WARNING 08: Person, \"" + subject + "\" is in subjects but not in MWG RegionList. Stick it in the Adobe mwgRegion",
    //             'exiftool -listItem 0 -RegionName+=\"' + subject + '\" ' + tagFile(entry.nativePath));
    //     }

    // });

    return [html, cmd];
};

function parseString(str) { if (str == undefined || str == null) return undefined; else return str.toString(); }


/**
 * Picks up the metadaa for the photo, parses it to find the People in Metadata Working Group format
 *  
 * @param {*} entry // File entry of file to extract metadata. If null, use the Photoshop metadata instead of xmpFile
 * @returns  [persons, subjects] directory of persons in the photo metadata and the subject subjects
 */

function readPersonsFromMetadata(entry) {
    if (entry != null && entry.name.includes("scan0737.jpg")) {
        let k = 5;
    }

    let persons = [];
    let subjects = [];

    let mpRegions = [];
    let mwgRegions = [];
    let dcSubjects = [];
    let html = [];
    let exiftool = [];

    let lastDate = "2021-09-15T00:22:20";

    // NOTE: the x and y point in the metadata is the center of the mwgRectangle for Adobe face Areas. i.e. (x,y) = (top-bottom)/2, (right-left)/2
    // Elsewhere in this program, we change the anchor point to be the center of the top of the mwgRectangle. 

    // There are two ways to get the Metadata; from the file directly with xmpFile or via BatchPlay from Photoshop
    // Either way should return the same data.  
    // The advantage of reading directly from the file is that the metadata can be read without incurring the overhead of loading the photo into photoshop
    // The disadvatnge is that, if a new document is created from history, then a file has not yet been written to the disk, but there is metadata 
    // available if read via photoshop

    // NOTE: XMPFile once in a while gets stuck and either needs Photoshop to be restarted or the computer to be rebooted.
    // getDocumentXMP is more reliable.
    let xmpMeta;
    let xmpFile = null;
    if (entry == null) {
        xmpMeta = new xmp.XMPMeta(getDocumentXMP());

    } else {
        xmpFile = new xmp.XMPFile(entry.nativePath, xmp.XMPConst.FILE_JPEG, xmp.XMPConst.OPEN_FOR_READ); // not listed as async
        xmpMeta = xmpFile.getXMP();  // not listed as async
    }
    const ns = "http://www.metadataworkinggroup.com/schemas/regions/";
    const NSArea = "http://ns.adobe.com/xmp/sType/Area#";
    const NSCRS = "http://ns.adobe.com/camera-raw-settings/1.0/";
    const XMPDateTime = require('uxp').xmp.XMPDateTime;
    const MP = "http://ns.microsoft.com/photo/1.2/";
    const MPRI = "http://ns.microsoft.com/photo/1.2/t/RegionInfo#";
    const MPReg = "http://ns.microsoft.com/photo/1.2/t/Region#";
    try {

        //////////////////////      read in essential fields      ///////////////////////////////////////

        let top = parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropTop"));
        let bottom = 1 - parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropBottom"));
        let left = parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropLeft"));
        let right = 1 - parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropRight"));
        const appliedToHeight = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:AppliedToDimensions/stDim:h"));
        const appliedToWidth = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:AppliedToDimensions/stDim:w"));
        let dateTaken = parseString(xmpMeta.getProperty(xmpConstants.NS_XMP, "xmp:CreateDate"));
        const dateModified = parseString(xmpMeta.getProperty(xmpConstants.NS_XMP, "xmp:ModifyDate"));

        for (let i = 1; xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]") != undefined; i++) {
            let rect = parseString(xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]/MPReg:mwgRectangle"));
            const personDisplayName = capitalize(parseString(xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]/MPReg:PersonDisplayName")));

            if ((rect == undefined))
                mpRegions.push({ "name": personDisplayName });
            else {
                rect = rect.split(",");
                const mpRegion = {
                    "name": personDisplayName,
                    "rect": [
                        Number(rect[0]),  // x top left coordinate in the original uncropped photo
                        Number(rect[1]),  // y top left coordinate in the original uncropped photo
                        Number(rect[2]),
                        Number(rect[3])],
                    "rectType": "Face",
                    "unit": "normalized",
                    "rotation": undefined
                }
                mpRegions.push(mpRegion);
            }
        }


        for (let i = 1; xmpMeta.getProperty(xmpConstants.NS_DC, "dc:subject[" + i + "]") != undefined; i++) {
            let dcSubject = capitalize(parseString(xmpMeta.getProperty(xmpConstants.NS_DC, "dc:subject[" + i + "]")));
            dcSubjects.push(dcSubject);
        }

        for (let i = 1; xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]") != undefined; i++) {
            let personName = capitalize(parseString(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Name")));  // not listed as async
            let x = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "x"));
            let y = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "y"));
            let w = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "w"));
            let h = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "h"));
            let rectUnit = parseString(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "unit"));
            let rectType = parseString(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Type"));  // not listed as async
            let rotation = parseString(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Rotation"));  // not listed as async

            const mwgRegion = {
                "name": personName,
                "rect": [x, y, w, h],
                "rectType": rectType,
                "unit": rectUnit,
                "rotation": rotation
            };
            // ignore partially defined regiions. Both Microsoft and Adobe leave partially defined regions. Ignore them instead of try to deal withthem
            // if (hasArea(mwgRegion.rect) && (mwgRegion.name != undefined))
            mwgRegions.push(mwgRegion);

        }

        [html, exiftool] = checkProperties(entry, mwgRegions, dcSubjects, mpRegions);

        //////////////////////////////  fix up values ////////////////////////////

        if (!(isNaN(appliedToHeight) || isNaN(appliedToWidth))) {

            // When a photo is cropped in Lightroom, the appliedToWidth and appliedToHeight are the CROPPED dimensions.
            // However, the x,y,w,h are the relative (between 0 and 1) coordinates of the face mwgRectangle in the UNCROPPED photo.
            // To calculate the uncropped photos width and height, the original dimensions are the shrunken appliedTo dimensions
            // divided by the amount that was cropped out, that is available in CropTop, CropBottom, CropLeft, and CropRight 

            if (isNaN(top) || isNaN(bottom) || isNaN(left) || isNaN(right)) {
                top = left = bottom = right = 0.0;
            }

            const xAdj = 1 - (left + right);
            const yAdj = 1 - (top + bottom);
            let actualWidth = appliedToWidth;
            let actualHeight = appliedToHeight;
            if (!(xAdj <= 0 || xAdj > 1 || yAdj <= 0 || yAdj > 1 ||
                isNaN(appliedToHeight) || isNaN(appliedToWidth))) {
                actualWidth = appliedToWidth / xAdj;
                actualHeight = appliedToHeight / yAdj;
            }

            // the dateTaken may be missing so create some date

            if (dateTaken != undefined)
                dateTaken = dateTaken.toString();
            else if (dateModified != undefined)
                dateTaken = dateModified.toString();
            else
                dateTaken = lastDate;
            lastDate = dateTaken;
            let javascriptDate = new XMPDateTime(dateTaken).getDate();

            dcSubjects.forEach((dcSubject) => { subjects.push(dcSubject) });

            mwgRegions.forEach((mwgRegion) => {

                const person = {
                    "name": mwgRegion.name,
                    "x": mwgRegion.rect[0] * actualWidth,       // x pixel coordinate in the original uncropped photo
                    "y": mwgRegion.rect[1] * actualHeight,      // y pixel coordinate in the original uncropped photo
                    "w": mwgRegion.rect[2] * appliedToWidth,    // mwgRectangle number of pixels wide
                    "h": mwgRegion.rect[3] * appliedToHeight,   // mwgRectangle number of pixels high
                    "entry": entry,                             // File pointer for opening in photoshop
                    "dateTaken": javascriptDate,
                };
                persons.push(person);
            })
        }

    } catch (e) {
        console.log("metadata error  " + e.toString() + "  FILE: " + entry.name);
    }

    if (xmpFile != null)
        xmpFile.closeFile(0);

    return [persons, subjects, html, exiftool];

};

/**
 * picks up the metadata of the currently loaded photo in Photoshop
 * @returns text buffer containing the metadata
 */
const getDocumentXMP = () => {

    return batchPlay(
        [
            {
                _obj: "get",
                _target: {
                    _ref: [
                        { _property: "XMPMetadataAsUTF8" },
                        { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                    ],
                },
            },],
        { synchronousExecution: true }
    )[0].XMPMetadataAsUTF8;
};

module.exports = {
    readPersonsFromMetadata
};


