
// copywrite 2023-2024 Richard R. Lyman




/**
 * 
 * @param {*} rect x,y,w,h dimensions of rectangle
 * @returns true if the rect is undefined
 */
function hasArea(rect) {
    let bRect = true;
    rect.forEach((dim) => {
        if (dim == undefined || isNaN(dim))
            bRect = false;
    })
    return bRect;
};

/**
 * 
 * @param {*} persons Array from mwg-rs:Regions
 * @param {*} subjects Array from dc:Subject
 * @param {*} mpPersons Array from Microsoft MP:RegionInfo
 * @returns metaDataErrors array of strings containing errors.
 */
function checkProperties(entry, mwgPersons, subjects, mpPersons) {

    let metaDataErrors = [];
    let exiftool = [];
    let onlyOne = true;
    const tabs = "&nbsp;&nbsp;&nbsp;&nbsp;"

    mwgPersons.forEach((mwgPerson) => {

        if (mwgPerson.name != undefined && mwgPerson.name.includes("Karlberg")) {
            let k = 5;
        }

        if (!hasArea(mwgPerson.rect)) {
            metaDataErrors.push("ERROR 01: \"" + mwgPerson.name + "\" is in an MWG RegionList without x,y,w,h rectangle information.");
            metaDataErrors.push(tabs + "Recommend: TBD");
        }

        if (mwgPerson.name == undefined) {
            if (onlyOne) {
                metaDataErrors.push("WARNING 02: There is an MWG rectangle, without a NAME in a MWG region.");
                metaDataErrors.push(tabs + "Recommend: In Lightroom Classic, add a person's name to the rectangle or delete the rectangle");
                onlyOne = false;
            }

        } else if (!subjects.includes(mwgPerson.name)) {
            metaDataErrors.push("WARNING 03: \"" + mwgPerson.name + "\" is in MWG rectangle but is not in dc:subject");           
            metaDataErrors.push(tabs + "Recommend: exiftool -Keywords+=\"" + mwgPerson.name  + "\" \""  + entry.nativePath + "\" ");
            metaDataErrors.push(tabs + "Recommend: exiftool -Subject+=\"" + mwgPerson.name  + "\" \""  + entry.nativePath + "\" ");     
            exiftool.push('exiftool  -Keywords+=\"' + mwgPerson.name  + '\" \"'  + entry.nativePath + '\"\r\n');
            exiftool.push('exiftool  -Subject+=\"' + mwgPerson.name  + '\" \"'  + entry.nativePath + '\"\r\n');                    
        }
    });

    // mpPersons.forEach((mpPerson) => {
    for (let x in mpPersons) {
        let mpPerson = mpPersons[x];
        let missingPerson = true;

        mwgPersons.forEach((mwgPerson) => {
            if (mpPerson.name == mwgPerson.name && mpPerson.rect != undefined && mwgPerson.rect != undefined) {
                missingPerson = false;

                const rectA = mwgPerson.rect;
                const rectB = mpPerson.rect.split(",");

                const a = [rectA[0], rectA[1], rectA[2], rectA[3]]
                const b = [rectB[0] - rectB[2] / 2, rectB[1] - rectB[3] / 2, rectB[2], rectB[3]];
                for (let i = 0; i < 4; i++) {
                    if ((rectA[i] < rectB[i] - .01) || (rectA[i] > rectB[i] + .01)) {
                        metaDataErrors.push("WARNING 04: The MP rectangle [" + rectB.join(', ') + "] for person \"" + mwgPerson.name +
                            "\" does not line up with MWG rectangle [" + rectA.join(', ') + "]");
                        metaDataErrors.push(tabs + "Recommend: In lightroom, check to see that the face rectangle is centered on the persons, If OK, ignore");
                        metaDataErrors.push(tabs + "Recommend: exiftool -config convert_regions.config  \'-RegionInfoMP&lt;MWGRegion2MPRegion\' \'" + entry.nativePath + "\' ");     
                        exiftool.push('exiftool -config convert_regions.config  \"-RegionInfoMP<MWGRegion2MPRegion\" \"' + entry.nativePath + '\"\r\n');                                           
                        break;
                    }
                }
            }
        }
        );

        if (missingPerson) {
            metaDataErrors.push("WARNING 05: Person, \"" + mpPerson.name + "\" is in microsoft Region but not in MWG RegionList");
            metaDataErrors.push(tabs + "Recommend: exiftool -config convert_regions.config  \'-RegionInfo&lt;MPRegion2MWGRegion\' \'" + entry.nativePath + "\' ");
            exiftool.push('exiftool -config convert_regions.config  \"-RegionInfo<MPRegion2MWGRegion\" \"' + entry.nativePath + '\"\r\n');            
        }

    };
    return [metaDataErrors, exiftool];
};

function parseString(str) { if (str == undefined) return undefined; else return str.toString(); }


/**
 * Picks up the metadaa for the photo, parses it to find the People in Metadata Working Group format
 *  
 * @param {*} entry // File entry of file to extract metadata. If null, use the Photoshop metadata instead of xmpFile
 * @returns  [persons, subjects] directory of persons in the photo metadata and the subject subjects
 */

function readPersonsFromMetadata(entry) {
    if (entry != null && entry.name.includes("page108.jpg")) {
        let k = 5;
    }

    let persons = [];
    let subjects = [];

    let mpPersons = [];
    let mwgPersons = [];
    let dcSubjects = [];
    let metaDataErrors = [];
    let exiftool = [];

    let lastDate = "2021-09-15T00:22:20";

    // NOTE: the x and y point in the metadata is the center of the rectangle for Adobe face Areas. i.e. (x,y) = (top-bottom)/2, (right-left)/2
    // Elsewhere in this program, we change the anchor point to be the center of the top of the rectangle. 

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
            const rect = parseString(xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]/MPReg:Rectangle"));
            const personDisplayName = parseString(xmpMeta.getProperty(MP, "MP:RegionInfo/MPRI:Regions[" + i + "]/MPReg:PersonDisplayName"));
            // ignore partially defined regions
            if ((rect != undefined) && (personDisplayName != undefined))
                mpPersons.push({ "rect": rect, "name": personDisplayName });
        }
        for (let i = 1; xmpMeta.getProperty(xmpConstants.NS_DC, "dc:subject[" + i + "]") != undefined; i++) {
            let dcSubject = parseString(xmpMeta.getProperty(xmpConstants.NS_DC, "dc:subject[" + i + "]"));
            dcSubjects.push(dcSubject);
        }

        for (let i = 1; xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]") != undefined; i++) {
            let personName = parseString(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Name"));  // not listed as async
            let x = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "x"));
            let y = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "y"));
            let w = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "w"));
            let h = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "h"));
            const mwgPerson = {
                "name": personName,
                "rect": [x, y, w, h],
            };
            // ignore partially defined regiions. Both Microsoft and Adobe leave partially defined regions. Ignore them instead of try to deal withthem
            if (hasArea(mwgPerson.rect) && (mwgPerson.name != undefined))
                mwgPersons.push(mwgPerson);

        }
        [metaDataErrors, exiftool] = checkProperties(entry, mwgPersons, dcSubjects, mpPersons);

        //////////////////////////////  fix up values ////////////////////////////

        if (!(isNaN(appliedToHeight) || isNaN(appliedToWidth))) {

            // When a photo is cropped in Lightroom, the appliedToWidth and appliedToHeight are the CROPPED dimensions.
            // However, the x,y,w,h are the relative (between 0 and 1) coordinates of the face rectangle in the UNCROPPED photo.
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

            mwgPersons.forEach((mwgPerson) => {

                const person = {
                    "name": mwgPerson.name,
                    "x": mwgPerson.rect[0] * actualWidth,       // x pixel coordinate in the original uncropped photo
                    "y": mwgPerson.rect[1] * actualHeight,      // y pixel coordinate in the original uncropped photo
                    "w": mwgPerson.rect[2] * appliedToWidth,    // rectangle number of pixels wide
                    "h": mwgPerson.rect[3] * appliedToHeight,   // rectangle number of pixels high
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

    return [persons, subjects, metaDataErrors, exiftool];

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


