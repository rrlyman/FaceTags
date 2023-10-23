
// copywrite 2023 Richard R. Lyman

const { getDocumentXMP} = require("./tagBatchPlay.js");
/**
 * Picks up the metadaa for the photo, parses it to find the People in Metadata Working Group format
 *  * 
 * @returns [{personName, x, y, w, h}] Returns a 0 length array if no metadata is found
 */
function readPersonsFromMetadata() {

    const xmp = require("uxp").xmp;
    const xmpEntry = require('uxp').storage.Entry;

    let persons = Array();

    // NOTE: the x and y point in the metadata is the center of the rectangle for Adobe face Areas. i.e. (x,y) = (top-bottom)/2, (right-left)/2
    // Elsewhere in this program, we change the anchor point to be the center of the top of the rectangle.  This establishes a fixed reference point below the chin

    // There are two ways to get the Metadata; from the file directly with xmpFile or via BatchPlay from Photoshop
    // Either way should return the same data.

    //const xmpFile = new xmp.XMPFile(filePath, xmp.XMPConst.FILE_JPEG, xmp.XMPConst.OPEN_FOR_READ); // not listed as async
    //const xmpMeta = xmpFile.getXMP();  // not listed as async
    //const xmpMetaFromDocument = getDocumentXMP();
    const xmpMeta = new xmp.XMPMeta(getDocumentXMP());
    const ns = "http://www.metadataworkinggroup.com/schemas/regions/";
    const ns2 = "http://ns.adobe.com/xmp/sType/Area#";

    for (let i = 1; i < 1000; i++) {
        const personName = xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Name");  // not listed as async

        // x, y, w, and h are in the range 0 to 1.0 and represent a fraction of the document width and height
        const x = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area/stArea:x"));

        // we are done with all the rectangles if we got to the end.
        if (x == undefined || isNaN(x))
            break;

        const y = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area/stArea:y"));
        const w = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area/stArea:w"));
        const h = parseFloat(xmpMeta.getProperty(ns, "mwg-rs:Regions/mwg-rs:RegionList[" + i + "]/mwg-rs:Area/stArea:h"));

        // Skip over blank names. Lightroom Classic puts in the rectangle with no name. The name shouws in Lightroom as a '?'
        if (personName == undefined || personName.Length == 0)
            continue;

        const person = {
            "name": personName.toString(),
            "x": x,
            "y": y,
            "w": w,
            "h": h
        };
        persons.push(person);
    }
    return persons;
};

module.exports = {
    readPersonsFromMetadata
};