
// copywrite 2023 Richard R. Lyman


/**
 * Picks up the metadaa for the photo, parses it to find the People in Metadata Working Group format
 *  * 
 * @returns [{personName, x, y, w, h}] Returns a 0 length array if no metadata is found
 */
function readPersonsFromMetadata(filePath) {

    const xmp = require("uxp").xmp;
    const xmpEntry = require('uxp').storage.Entry;
    const constants = require('uxp').xmp.XMPConst;
    let persons = Array();

    // NOTE: the x and y point in the metadata is the center of the rectangle for Adobe face Areas. i.e. (x,y) = (top-bottom)/2, (right-left)/2
    // Elsewhere in this program, we change the anchor point to be the center of the top of the rectangle. 

    // There are two ways to get the Metadata; from the file directly with xmpFile or via BatchPlay from Photoshop
    // Either way should return the same data.  
    // The advantage of reading directly from the file is that the metadata can be read without incurring the overhead of loading the photo into photoshop
    // The disadvatnge is that, if a new document is created from history, then a file has not yet been written to the disk, but there is metadata 
    // available if read via photoshop

    // NOTE: XMPFile once in a while gets stuck and either needs Photoshop to be restarted or the computer to be rebooted.
    // getDocumentXMP is more reliable.

    const xmpFile = new xmp.XMPFile(filePath, xmp.XMPConst.FILE_JPEG, xmp.XMPConst.OPEN_FOR_READ); // not listed as async
    const xmpMeta = xmpFile.getXMP();  // not listed as async
    //const xmpMeta = new xmp.XMPMeta(getDocumentXMP());
    const ns = "http://www.metadataworkinggroup.com/schemas/regions/";
    const NSArea = "http://ns.adobe.com/xmp/sType/Area#";

    for (let i = 1; i < 1000; i++) {
        // check for unregistered name space, happens if there are no mwg-rs entries in the metadata
        let personName = "";
        try {
            personName = xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Name");  // not listed as async
        } catch (e) {
            break;
        }

        // x, y, w, and h are in the range 0 to 1.0 and represent a fraction of the document width and height
        const x = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "x"));

        // we are done with all the rectangles if we got to the end.
        if (x == undefined || isNaN(x))
            break;

        const y = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "y"));
        const w = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "w"));
        const h = parseFloat(xmpMeta.getStructField(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area", NSArea, "h"));

        // Skip over blank names. Lightroom Classic puts in the rectangle with no name. The name shouws in Lightroom as a '?'
        if (personName == undefined || personName.length == 0)
            continue;

        const person = {
            "name": personName.toString(),
            "x": x,
            "y": y,
            "w": w,
            "h": h
        };
        persons.push(person);
    };
    xmpFile.closeFile(0);
    return persons;
};

/**
 * picks up the metadata of the currently loaded photo in Photoshop
 * @returns text buffer containing the metadata
 */
const getDocumentXMP = () => {
    const { batchPlay } = require("photoshop").action;
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