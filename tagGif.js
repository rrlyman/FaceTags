
// copywrite 2023 Richard R. Lyman

const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { getFaceTagsTreeName, skipThisEntry } = require("./tagFace.js");

const { executeAsModal } = require("photoshop").core;
const { batchPlay } = require("photoshop").action;
// Get the object of a File instance
const fs = require('uxp').storage.localFileSystem;
const { app, constants } = require("photoshop");

let personsIndex = {};  // index of all the best thumbnails, one per year per person
/**
 * Opens up a folder dialog box to select top folder to process
 * Makes a new folder called originalPhotosFolder_n and builds a tree under it that duplicates
 * the source tree. Populates it with tagged photos of the originals.
 * 
 * Annotates each file with the face tag labels for each person found in the file metadata 
 * 
 * @param {*} originalPhotosFolder       Folder Entry that is navigating the folder tree with the original photos. null if is the initial call

 * @returns 
 */
async function gifBatchFiles(originalPhotosFolder,) {
   if (originalPhotosFolder == null) {  // null is the initial call
      originalPhotosFolder = await fs.getFolder();
      if (originalPhotosFolder == null) {  // null if user cancels dialog              
         return;
      }
      personsIndex = {};
      disableButtons();  // only enable the Cancel button     
   }

   // gather all the years of the each person

   await createIndex(originalPhotosFolder);

   await makeGifs(originalPhotosFolder, "Big", 300);
   await makeGifs(originalPhotosFolder, "Little", 70);
   enableButtons();
};
/**
 *    
 * @param {*} originalPhotosFolder  // top level foldeer containing the photos
 * @param {*} gifName               // folder name  underneath the top level containing the output gifs
 * @param {*} gifSize               // size of the gifs in pixels.
 */
async function makeGifs(originalPhotosFolder, gifName, gifSize) {

   // create gif folder
   const ents = await originalPhotosFolder.getEntries();
   gifFolder = await originalPhotosFolder.createFolder(getFaceTagsTreeName(gifName, ents, gifSuffix));

   for (var personKey in personsIndex) {
      if (stopTag)
         break;
      const dpi = 72;
      const inflate = 1;
      let gifDoc = await executeAsModal(() => app.documents.add({
         width: gifSize,
         height: gifSize,
         resolution: dpi,
         mode: "RGBColorMode",
         fill: "transparent" 
      }), { "commandName": "New File" });
      lastYear = 0;
      for (var yearKey in personsIndex[personKey]) {
         if (stopTag)
            break;
         if (Number(yearKey) < lastYear)
            alert("Years are out of order");
         lastYear = yearKey;

         // make the source rectangle the size of the gif
         let person = personsIndex[personKey][yearKey];
         let sourceDoc = await executeAsModal(() => app.open(person.entry), { "commandName": "Opening batched File" });

         const left = person.x - inflate * person.w;
         const right = person.x + inflate * person.w;
         const top = person.y  - inflate * person.h;
         const bottom = person.y  + inflate * person.h;
         let bounds = { left: Math.max(0, left), top: Math.max(0, top), right: Math.min(sourceDoc.width, right), bottom: Math.min(sourceDoc.height, bottom) };
 
         await executeAsModal(() => sourceDoc.crop(bounds), { "commandName": "Crop File" });
         await executeAsModal(() => sourceDoc.resizeImage(gifSize, gifSize, dpi), { "commandName": "Resize batched File" });

         // paste the source rectangle into the gifDoc

         await selectAllandCopy();
         await executeAsModal(() => gifDoc.paste(), { "commandName": "Pasting" });
         await executeAsModal(() => sourceDoc.closeWithoutSaving(), { "commandName": "Closing" });
         await new Promise(r => setTimeout(r, 100));    // required to give time to process Cancel Button

      }
   
      let fname = personKey + '.gif';
      if (gifDoc.layers.length > 1) {
         await makeGif();
         let saveEntry = await gifFolder.createFile(fname); // similar name as original but store on tagged tree.
         await executeAsModal(() => gifDoc.saveAs.gif(saveEntry), { "commandName": "Saving" });
      }
      await executeAsModal(() => gifDoc.closeWithoutSaving(), { "commandName": "Closing" });
   }

   console.log("topRecursionLevel");
};

/** Create an index of all the face rectangles in the folder tree
 * 
 * @param {*} originalPhotosFolder 
 * @returns 
 */
async function createIndex(originalPhotosFolder) {

   // process all the files and folders in the originalPhotosFolder
   const entries = await originalPhotosFolder.getEntries();
   for (let i = 0; (i < entries.length) && (!stopTag); i++) {
      const entry = entries[i];;

      if (skipThisEntry(entry))
         continue;

      // recurse folders

      if (entry.isFolder) {
         await createIndex(entry);
      } else {
         ////////////////////     PAYLOAD START     /////////////////////     
         let persons = readPersonsFromMetadata(entry);

         // create a dictionary of person names each of which
         // has an value of another dictionary with an entry for each year
         // the value of which is the filename, person name, biggest area face rectange for the year, etc

         for (let i = 0; i < persons.length && (!stopTag); i++) {
            let person = persons[i];
            const year = person.dateTaken.split("-")[0];  // year   
            if (!(person.name in personsIndex))
               personsIndex[person.name] = {};
            if (!(year in personsIndex[person.name]) ||
               !(personsIndex[person.name][year].w * personsIndex[person.name][year].h < person.w * person.h)) {
               personsIndex[person.name][year] = person;
            }
         }
         ////////////////////     PAYLOAD END     /////////////////////                  
      }
   }
};


async function selectAllandCopy_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "set",
            _target: [
               {
                  _ref: "channel",
                  _property: "selection"
               }
            ],
            to: {
               _enum: "ordinal",
               _value: "allEnum"
            },
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
   const result2 = await batchPlay(
      [
         {
            _obj: "copyEvent",
            copyHint: "pixels",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function selectAllandCopy() {
   await executeAsModal(selectAllandCopy_actn, { "commandName": "Action selectAllandCopy" });
}


async function makeGif_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "makeFrameAnimation",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
   const result1 = await batchPlay(
      [
         {
            _obj: "animationFramesFromLayers",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
   const result2 = await batchPlay(
      [
         {
            _obj: "animationSelectAll",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );

   const result3 = await batchPlay(
      [
         {
            _obj: "set",
            _target: [
               {
                  _ref: "animationFrameClass",
                  _enum: "ordinal",
                  _value: "targetEnum"
               }
            ],
            to: {
               _obj: "animationFrameClass",
               animationFrameDelay: 0.5
            },
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function makeGif() {
   await executeAsModal(() => makeGif_actn(), { "commandName": "Action Commands" });
}

module.exports = {
   gifBatchFiles
};