
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

function tagFile(nativePath) {
    let str = nativePath;
    str = "-m \"" + nativePath + "\"   ";
    return str;
}

function noDifs(subjects) {
    let z = [];
    subjects.forEach((x) => {
        if (x != undefined)
            z.push(x)
    });
    return z;
}
/**
 * Copy the names in the regions to the keywords and Subject
 * @param {*} nativePath 
 * @param {*} html 
 * @param {*} cmd 
 * @param {*} regions 
 * @param {*} subjects 
 */
function refreshSubjects(nativePath, html, cmd, regions, subjects) {
    if (regions != undefined) {
        regions.forEach((region) => {
            if (region.name != undefined) {
                if (!noDifs(subjects).includes(region.name)) {
                    errorLog(html, cmd,
                        "WARNING 03: \"" + region.name + "\" is in MWG mwgRectangle but is not in dc:subject. Copy the name to the keywords and Subject",
                        "exiftool  -Keywords-=\"" + region.name + "\" -Subject-=\"" + region.name + "\"  -Subject+=\"" + region.name + "\" -Keywords+=\"" + region.name + "\" " + tagFile(nativePath));

                }
            }
        });
    }
}

function regionInfoStruc(mRegions, appliedToWidth, appliedToHeight) {
    let str;
    if (isNaN(appliedToHeight) || isNaN(appliedToWidth))
        str = "RegionList=[";
    else
        str = "{AppliedToDimensions={H=" + appliedToHeight + ", Unit=pixels, W=" + appliedToWidth + "} , RegionList=[";


    let x = [];
    for (i in mRegions) {
        const mRegion = mRegions[i];
        if (mRegion != undefined) {
            const rect = mRegion.rect;
            x = x.concat("{ Area={ H=" + rect[3].toFixed(4) + ", W=" + rect[2].toFixed(4) + ", X=" + rect[0].toFixed(4) + ", Y=" + rect[1].toFixed(4) + "}, Name=" + mRegion.name + ", Rotation=0.000000, Type=Face } ");
        }
    };
    return str + x.join(", ") + "]}";
}


/**
 * Checks and synchronizes properties between Adobe (MWG) and Microsoft (MP) face region metadata,
 * and generates warnings and ExifTool commands for inconsistencies or issues found.
 *
 * @param {Object} nativePath - The file path object, expected to have a `nativePath` property.
 * @param {Array<Object>} mwgRegions - Array of Adobe (MWG) region objects, each with at least a `name` and `rect`.
 * @param {Array<string>} subjects - Array of subject names (typically face tags).
 * @param {Array<Object>} mpRegions - Array of Microsoft (MP) region objects, each with at least a `name` and `rect`.
 * @param {number} appliedToWidth - The width value used for region normalization.
 * @param {number} appliedToHeight - The height value used for region normalization.
 * @returns {[Array<string>, Array<string>]} An array containing two arrays: 
 *   - The first array contains HTML warning messages.
 *   - The second array contains ExifTool command strings to fix detected issues.
 */
function checkProperties(nativePath, mwgRegions, subjects, mpRegions, appliedToWidth, appliedToHeight) {

    let html = [];
    let cmd = [];
    let mwgNames = [];
    let mpNames = [];
    mwgRegions.forEach((mwgRegion) => {
        if (mwgRegion.name != undefined)
            mwgNames.push(mwgRegion.name)
    });
    mpRegions.forEach((mpRegion) => {
        if (mpRegion.name != undefined)
            mpNames.push(mpRegion.name)
    });

    if (mwgRegions.length == 0 && mpRegions.length > 0) {
        errorLog(html, cmd,
            "WARNING 02: There are Microsoft regions but no Adobe regions. Copy all the valid Microsoft regions to the Adobe regions.",
            'exiftool -config facetags.config  -RegionInfo<MPRegion2MWGRegion ' + tagFile(nativePath));
        refreshSubjects(nativePath, html, cmd, mpRegions, []);
    };

    refreshSubjects(nativePath, html, cmd, mwgRegions, subjects);

    // deletes quotation marks that are in the subject name
    let done = false;
    subjects.forEach((subject) => {
        if ((!done) && subject.includes("\"")) {
            done = true;
            errorLog(html, cmd,
                "WARNING 04: Subject, \"" + subject + "\" contains quotation marks. Remove them",
                "exiftool -TagsFromFile @ -api 'Filter=s/\\\"//g'  -Keywords=  " + tagFile(nativePath));
            errorLog(html, cmd,
                "",
                "exiftool -TagsFromFile @ -api 'Filter=s/\\\"//g'   -Subject=  " + tagFile(nativePath));
            refreshSubjects(nativePath, html, cmd, mwgRegions, []);
        }
    });


    //if there is a name in the subjects and it is not in the adobe regions but it is  in the Microsoft regions, then copy over the Microsoft Regions
    let newRegions = [];
    let newNames = [];


    subjects.forEach((subject) => {
        let indx = mpNames.indexOf(subject);

        if (!mwgNames.includes(subject) && indx >= 0) {
            newRegions.push(mpRegions[indx]);
            newNames.push(subject);
        }
    })
    if (newRegions.length > 0) {

        errorLog(html, cmd,
            "WARNING 07: The Microsoft rectangle for \"" + newNames.join(", and ") + "\" " +
            "is missing from the matching Adobe rectangle. Transfer the name from the Microsoft region to the Adobe region.",
            'exiftool -config facetags.config  -RegionInfo<MPRegion2MWGRegion ' + tagFile(nativePath));
        // "exiftool   -RegionInfo=\"" + regionInfoStruc(mpRegions, appliedToWidth, appliedToHeight) + "\"  " + tagFile(nativePath));
        errorLog(html, cmd,
            "WARNING 07a: The Microsoft rectangle for \"" + newNames.join(", and ") + "\" " +
            "is missing from the matching Adobe rectangle. Transfer the name from the Microsoft region to the Adobe region.",
            "exiftool  -Keywords-=\"" + zKey + "\" -Subject-=\"" + zKey + "\"  -Subject+=\"" + zKey + "\"  -Keywords+=\"" + zKey + "\" " + tagFile(nativePath));

        refreshSubjects(nativePath, html, cmd, mpRegions, []);
    }


    // if there is an  unidentified rectangle (has a ? for a name), with the same dimensions in Microsoft and Adobe and the name is in the Microsoft rectangles, than add it back in.

    newNames = [];

    for (let i in mwgRegions) {

        for (let k in mpRegions) {

            if (isSameArea(mwgRegions[i].rect, mpRegions[k].rect)) {
                if ((mwgRegions[i].name == undefined || mwgRegions[i].name.length == 0) && (mpRegions[k].name != undefined && mpRegions[k].name.length != 0)) {
                    // mwgRegions[i] = mpRegions[k];
                    newNames.push(mpRegions[k].name);
                }
            }
        }
    }
    if (newNames.length > 0) {

        errorLog(html, cmd,
            "WARNING 05: The Microsoft rectangle for \"" + newNames.join(", and ") + "\" " +
            "is missing from the matching Adobe rectangle. Transfer the name from the Microsoft region to the Adobe region.",
            "exiftool   -RegionInfo=\"" + regionInfoStruc(mpRegions, appliedToWidth, appliedToHeight) + "\"  " + tagFile(nativePath));

        refreshSubjects(nativePath, html, cmd, mwgRegions, []);
    }
    let dupNames = [];
    let foundDup = false;
    for (let i = 0; i < mwgRegions.length; i++) {
        for (let k = i + 1; k < mwgRegions.length; k++) {
            if (mwgRegions[i] != undefined && mwgRegions[i].name != undefined && mwgRegions[k].name != undefined && mwgRegions[i].name == mwgRegions[k].name) {
                foundDup = true;
                dupNames.push(mwgRegions[i].name);
                delete mwgRegions[i];
            }
        }
    }
    if (foundDup) {
        errorLog(html, cmd,
            "WARNING 06: Remove duplicate names " + dupNames.join(",") + " from Adobe regions.",
            "exiftool   -RegionInfo=\"" + regionInfoStruc(mwgRegions, appliedToWidth, appliedToHeight) + "\"  " + tagFile(nativePath));
    }


    return [html, cmd];
};

function parseString(str) { if (str == undefined || str == null) return undefined; else return str.toString(); }



/**
 * Reads person and region metadata from an image entry using XMP metadata.
 *
 * Extracts face/person regions and related metadata from either a file entry or the currently open document,
 * supporting both Microsoft and Adobe (MWG) region schemas. Handles cropping, rotation, and normalization
 * of region coordinates. Returns structured information about detected persons, subjects, and region names.
 *
 * @param {Object|null} entry - The file entry object containing metadata, or null to use the current document.
 * @returns {[Array<Object>, Set<string>, Array, Array, Set<string>]} 
 *   An array containing:
 *     1. persons: Array of person objects with name, coordinates, dimensions, entry, and dateTaken.
 *     2. subjects: Set of subject names (from dc:subject).
 *     3. html: Array of HTML strings or fragments for UI/debugging.
 *     4. cmd: Array of command objects or strings for further processing.
 *     5. regionNames: Set of unique region/person names found in the metadata.
 *
 * @throws Will log errors to the console if metadata cannot be read or parsed.
 */
function readPersonsFromMetadata(entry) {
    if (entry != null && entry.name.includes(fileToDebug)) {
        let k = 5;
    }

    let persons = [];
    let subjects = new Set();
    let regionNames = new Set();

    let mpRegions = [];
    let mwgRegions = [];
    let dcSubjects = [];
    let html = [];
    let cmd = [];

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
    let nativePath = "current document";
    if (entry == null) {
        xmpMeta = new xmp.XMPMeta(getDocumentXMP());

    } else {
        nativePath = entry.nativePath;
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
        try {
            for (let i = 1; xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]") != undefined; i++) {
                let rect = parseString(xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]/MPReg:Rectangle"));
                const personDisplayName = capitalize(parseString(xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]/MPReg:PersonDisplayName")));

                if ((rect == undefined))
                    mpRegions.push({ "name": personDisplayName });
                else {
                    rect = rect.split(",");
                    const mpRegion = {
                        "name": personDisplayName,
                        "rect": [
                            Number(rect[0]) + Number(rect[2]) / 2,  // x top left coordinate in the original uncropped photo
                            Number(rect[1]) + Number(rect[3]) / 2,  // y top left coordinate in the original uncropped photo
                            Number(rect[2]),
                            Number(rect[3])],
                        "rectType": "Face",
                        "unit": "normalized",
                        "rotation": undefined
                    }
                    mpRegions.push(mpRegion);
                }
            }
        } catch (e) {

            console.log("Missing Microsoft Schema " + e.toString() + "  FILE: " + nativePath);

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

            let newX = x;
            let newY = y;
            let newW = w;
            let newH = h;

            ///  correct for region rotation
            // x and y are the center of the rectangle measured from the upper left corner of the photo
            switch (rotation) {
                case "-1.57080":
                    newX = 1 - y;
                    newY = x;
                    newW = h;
                    newH = w;
                    break;
                case "1.57080":
                    newX = y;
                    newY = 1 - x;
                    newW = h;
                    newH = w;
                    break;
                case "3.14159":
                    newX = 1 - x;
                    newY = 1 - y;
                    break;
                case "-3.14159":
                    newX = 1 - x;
                    newY = 1 - y;
                    break;

                default:
                    break;
            }
            if (!(x == newX && y == newY && h == newH && w == newW)) {
                console.log("FILE: " + nativePath + ", personName=" + personName + ", rotation = ", rotation);
                console.log("   x = " + x + ", newX = " + newX);
                console.log("   y = " + y + ", newY = " + newY);
                console.log("   h = " + h + ", newH = " + newH);
                console.log("   w = " + w + ", newW = " + newW);
            }
            x = newX;
            y = newY;
            h = newH;
            w = newW;

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

        [html, cmd] = checkProperties(nativePath, mwgRegions, dcSubjects, mpRegions, appliedToWidth, appliedToHeight);

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

            dcSubjects.forEach((x) => { subjects.add(x) });

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
                if (!(person.name == undefined || person.x == undefined | person.y == undefined | person.w == undefined | person.h == undefined | person.dateTaken == undefined))
                    persons.push(person);

            })
        }

    } catch (e) {
        console.log("metadata error  " + e.toString() + "  FILE: " + nativePath);

    }

    if (xmpFile != null)
        xmpFile.closeFile(0);

    persons.forEach((person) => {
        regionNames.add(person.name);
    });
    return [persons, subjects, html, cmd, regionNames];

};

/**
 * picks up the metadata of the currently loaded photo in Photoshop
 * @returns text buffer containing the metadata
 */
const getDocumentXMP = () => {

    let result = batchPlay(
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
    );
    return result[0].XMPMetadataAsUTF8;
};

module.exports = {
    readPersonsFromMetadata
};


