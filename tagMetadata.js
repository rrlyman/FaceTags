
// copywrite 2023 Richard R. Lyman


let lastDate = "2021-09-15T00:22:20";
/**
 * Picks up the metadaa for the photo, parses it to find the People in Metadata Working Group format
 *  
 * @param {*} entry // File entry of file to extract metadata. If null, use the Photoshop metadata instead of xmpFile
 * @returns [{personName, x, y, w, h},subjects] Returns a 0 length array if no metadata is found
 *      subjects is cleaned of any names that are also persons
 */

function readPersonsFromMetadata(entry) {

    let persons = Array();
    let subjects = Array();

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
    try {
        // pick up essential fields
        const top = parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropTop"));
        const bottom = 1 - parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropBottom"));
        const left = parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropLeft"));
        const right = 1 - parseFloat(xmpMeta.getProperty(xmpConstants.NS_CAMERA_RAW, "crs:CropRight"));
        const appliedToHeight = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:AppliedToDimensions/stDim:h"));
        const appliedToWidth = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:AppliedToDimensions/stDim:w"));
        const dateTaken = xmpMeta.getProperty(xmpConstants.NS_XMP, "xmp:CreateDate");
        const dateModified = xmpMeta.getProperty(xmpConstants.NS_XMP, "xmp:ModifyDate");


        for (let i = 1; i < 1000; i++) {
            let subject = xmpMeta.getProperty(xmpConstants.NS_DC, "dc:subject[" + i + "]");
            if (subject == undefined)
                break;
            subjects.push(subject.toString());
        }

        // value checks
        if (isNaN(top) || isNaN(bottom) || isNaN(left) || isNaN(right)) {
            top = left = bottom = right = 0.0;
        }

        // adjustments
        if ((dateTaken == undefined) && (dateModified == undefined))
            dateTaken = lastDate;
        else if ((dateTaken == undefined) && (dateModified != undefined))
            dateTaken = dateModified;
        lastDate = dateTaken;


        const xAdj = 1 - (left + right);
        const yAdj = 1 - (top + bottom);

        // skip this photo if any of the following are wrong
        if (!(xAdj <= 0 || xAdj > 1 || yAdj <= 0 || yAdj > 1 ||
            isNaN(appliedToHeight) || isNaN(appliedToWidth))) {

            for (let i = 1; i < 1000; i++) {
                const personName = xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Name");  // not listed as async

                let x = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "x"));
                // we are done with all the rectangles if we got to the end.
                if (x == undefined || isNaN(x))
                    break;
                // Skip over blank names. Lightroom Classic puts in the rectangle with no name. The name shows in Lightroom as a '?'
                if (personName == undefined || personName.length == 0)
                    continue;
                let y = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "y"));
                let w = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "w"));
                let h = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "h"));

                // apply adjustments
                // When a photo is cropped in Lightroom, the appliedToWidth and appliedToHeight are the CROPPED dimensions.
                // However, the x,y,w,h are the relative (between 0 and 1) coordinates of the face rectangle in the UNCROPPED photo.
                // To calculate the uncropped photos width and height, the original dimensions are the shrunken appliedTo dimensions
                // divided by the amount that was cropped out, that is available in CropTop, CropBottom, CropLeft, and CropRight 
                x = x * appliedToWidth / xAdj;  // x pixel coordinate in the original uncropped photo
                y = y * appliedToHeight / yAdj; // y pixel coordinate in the original uncropped photo
                w *= appliedToWidth;            // number of pixels wide
                h *= appliedToHeight;           // number of pixels high

                // for each person, there is a list of keywords that apply to them

                let javascriptDate = new XMPDateTime(dateTaken.toString()).getDate();
                const person = {
                    "name": personName.toString(),
                    "x": x,         // x pixel coordinate in the original uncropped photo
                    "y": y,         // y pixel coordinate in the original uncropped photo
                    "w": w,         // rectangle number of pixels wide
                    "h": h,         // rectangle number of pixels high
                    "entry": entry, // File pointer for opening in photoshop
                    "dateTaken": javascriptDate       
                };

                persons.push(person);

  
            // remove the person from the subjects
            removeItemAll(subjects, person.name);
        } 
    }

    } catch (e) { }

    if (xmpFile != null)
        xmpFile.closeFile(0);
    return [persons, subjects];
};

function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i] === value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
  }

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