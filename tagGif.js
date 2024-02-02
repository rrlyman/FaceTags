
// copywrite 2023 Richard R. Lyman

const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { getFaceTagsTreeName, skipThisEntry, countFiles, writeErrors, writePersons, writeGlobalSubjects, removeIllegalFilenameCharacters, errorLog } = require("./tagUtils.js");


/* TBD 
create a folder results
create index.html with link to each person, each global keyword, a link to the error log
create <person>.html a file for each person with links to the files that they are in
create <keyword>.html a file for each global keyword with links to each person that has the global keyword
create errorLog.html a file with a link to each file containing an error

*/
class Gifs {
   init() {
      this.gifEntry = null;

      /**
       * personsDict is a dictionary, where the key is the person's name and the value is an array of  dictionaries containing the person's info
       * e.g. {"Rick Lyman": [
                  {"name": "Rick Lyman", 
                 "x": x, 
                  "y": y, 
                  "w": w, 
                  "h": h, 
                  "entry": entry, 
                  "dateTaken": javascriptDate },
                  {"name": "Rick Lyman", 
                 "x": x, 
                  "y": y, 
                  "w": w, 
                  "h": h, 
                  "entry": entry, 
                  "dateTaken": javascriptDate  }
             ]
        }
      }
    */
      this.personsDict = {};

      /**  
       * globalSubjects is a one to many dictionary, where the key is a subject( keyword), such as "Leal School" 
       * and the value is an array of the names of persons who have that subject on one of the photos with them in it.
       * e.g {"Leal School":  ["Rick Lyman", "Bob Jones"]}
       * */
      this.globalSubjects = {};

      /**  
       * globalFiles is a one to many dictionary, where the key is a subject( keyword), such as "Leal School" 
       * and the value is an array of the entries of files that have  that subject .
       * e.g {"Leal School":  [entry for c:/temp/photo1.jpg, entry for c:/temp/photos2.jpg]}
       * */
      this.globalFiles = {};

      /**savedMetaData is a directory with an entry for each file containing persons, subjects and errors */
      this.savedMetaData = {};

   }
   constructor() {

      /** root folder containing all the photos. If not null,  then an index already exists */
      this.originalPhotosFolder = null;
      this.init();
   }

   /** remove all entries from the drop down keyword menu */
   clearMenu() {
      // clean out the keyword list on the panel
      let menu = el.dropMenu;
      while (menu.options.length > 0)
         menu.options[0].remove();
      filterKeyword = "";
   }

   /**
  * Opens up a folder dialog box to select top folder to process
  * Makes a new folder called this.originalPhotosFolder-gifs_n and stores all the GIF files in that folder.
  * 
  * @returns none
  */
   async createIndex() {

      this.originalPhotosFolder = await fs.getFolder();
      if (this.originalPhotosFolder != null) {  // null if user cancels dialog      

         await disableButtons("Counting Files");
         progressbar.max = await countFiles(this.originalPhotosFolder);
         if (!stopFlag) {
            await disableButtons("Creating an Index");  // only enable the Cancel button 

            this.init();

            await this.recurseIndex(this.originalPhotosFolder);

            await disableButtons("Processing Index");

            this.clearMenu();      // clean out the keyword list on the panel

            // populate personDict

            for (let nativePath in this.savedMetaData) {
               this.savedMetaData[nativePath].persons.forEach((person) => {
                  if (this.personsDict[person.name] == undefined) this.personsDict[person.name] = [];
                  this.personsDict[person.name].push(person);
               })
            };

            for (let nativePath in this.savedMetaData) {
               this.savedMetaData[nativePath].subjects.forEach((subject) => {

                  // each person.name should also be in the array of subjects for a file
                  let foundSubjectInPersonDict = false;
                  this.savedMetaData[nativePath].persons.forEach((person) => {
                     if (person.name != undefined && person.name.toLowerCase() == subject.toLowerCase()) {
                        foundSubjectInPersonDict = true;
                     }
                  });

                  // it is an error if a subject is not in the rectangle metadata for a file but it is found as a person's name somewhere else, 
                  // i.e. it is not a valid global subject

                  if (!foundSubjectInPersonDict) {
                     // this is possibly a global subject

                     errorLog(this.savedMetaData[nativePath]["metaDataErrors"], this.savedMetaData[nativePath]["exiftool"],
                        "WARNING 00: \"" + subject + "\" is in the subjects or keywords but is missing from mwgRegions." +
                        " It is either a \"non person\" keyword (good) or an person's name that was erroneously put in the keywords without a face rectangle (bad).",
                        "");

                     if (this.globalSubjects[subject] == undefined) this.globalSubjects[subject] = [];

                     this.savedMetaData[nativePath].persons.forEach((person) => {
                        if (!this.globalSubjects[subject].includes(person.name))
                           this.globalSubjects[subject].push(person.name);
                     });
                  }
               });
            };

            let menu = el.dropMenu;
            let subjects = Object.keys(this.globalSubjects).sort();

            // purge the globalSubjects of any subjects that are also persons
            // This occurs when there is a person name in a subjects of a photo that but there is no person rectangle for them.

            for (let iSubject in subjects) {
               if (this.personsDict[subjects[iSubject]] != undefined) {
                  // console.log("purge" + subjects[iSubject]);
                  delete this.globalSubjects[subjects[iSubject]];
               }
            }

            // populate the file entries for the global subject
            for (let nativePath in this.savedMetaData) {
               this.savedMetaData[nativePath]["subjects"].forEach((subject) => {
                  if (subject != undefined) {
                     if (this.globalSubjects[subject] != undefined) {
                        if (this.globalFiles[subject] == undefined)
                           this.globalFiles[subject] = [];
                        // console.log("add global path" + subject);
                        this.globalFiles[subject].push(nativePath);
                     }
                  }
               })
            }


            // populate the drop down list with non person subjects, a divider and then persons

            subjects = Object.keys(this.globalSubjects).sort();
            for (let iSubject in subjects) {
               const item = document.createElement("sp-menu-item");
               item.textContent = subjects[iSubject];
               menu.appendChild(item);
            }

            menu.appendChild(document.createElement("sp-menu-divider"));

            let personNames = Object.keys(this.personsDict).sort();
            for (let i = 0; i < personNames.length; i++) {
               const item = document.createElement("sp-menu-item");
               item.textContent = personNames[i];
               menu.appendChild(item);
            }
         }
         await enableButtons();
      }
   };

   /** If the selected filterKeyword from the drop box is "" then use the this.personsDict as the source of the names to GIF. 
  * If the selected filterKeyword is in globalSubjects, then use all of the names for filterKeyword in the this.globalSubjects.
  * If the selected filtereyword is only in the personsDict, GIF only that person.
  * 
  * @param {*} newDict  a filtered version of the personsDict, unsorted!
  */
   async filtered() {

      //  create a dictionary of person names each of which

      /** There is one entry for each days of the person rectangles that were found.
      * e.g {person.name: {period: person}}   ( definition of the person's rectangle such as -13: personRick, -12: personBob etc
      * period is the number of gSettings.days periods since 1970, 
      * e.g. newDict {"personKey: "Rick Lyman",
      *                 {"1953", 
      *                    {  "name": Rick Lyman, 
      *                       "x": x, 
      *                        "y": y, 
      *                        "w": w, 
      *                        "h": h, 
      *                        "entry": entry, 
      *                        "dateTaken": javascriptDate
      *                     },
      *                  "1954",                         
      *                     {  "name": Rick Lyman, 
      *                        "x": x, 
      *                        "y": y, 
      *                        "w": w, 
      *                        "h": h, 
      *                        "entry": entry, 
      *                        "dateTaken": javascriptDate
      *                     }
      *                 }
      *               }
      * for the year 1957 and a period setting of 365 days then the period would be would be -13 (yeares before 1970)
      * */
      let newDict = {};
      const msPerPeriod = 1000 * 60 * 60 * 24 * gSettings.days;
      await disableButtons("Applying Options");

      // Filters the array of times by only including one time in a given time period  in the newDict (perios value set in the slider)

      for (let personKey in this.personsDict) {
         this.personsDict[personKey].forEach((person) => {

            if (!(person.name in newDict)) newDict[person.name] = {};

            if (msPerPeriod == 0) {
               newDict[person.name][Math.floor(person.dateTaken.getTime())] = person;  // if days == 0, include all gifs for that person

            } else {
               const period = Math.floor(person.dateTaken.getTime() / msPerPeriod);

               if (!(period in newDict[person.name]) ||
                  !(newDict[person.name][period].w * newDict[person.name][period].h < person.w * person.h)) {
                  newDict[person.name][period] = person;
               }
            }
         })
      };

      // There are 3 cases, 
      // 1) no dropDown list item has been selected, therefore GIF every person
      // 2) a global subject has been selected, GIF every person who has that global subject in at least one file
      // 3) a person's name has been selected, only GIF that one person     


      if (filterKeyword == "")
         return newDict;  // GIF everyone

      /** newDict2 has the same structure as newDict, but only includes people who have the filterKeyword in one of their photos */
      let newDict2 = {};

      // sticks anyone in the new dictionary that had the filterKeyword, which is a global subject, in the file's subject

      if (this.globalSubjects[filterKeyword] != undefined) {
         this.globalSubjects[filterKeyword].forEach((pName) => {
            if (newDict[pName] != undefined)
               newDict2[pName] = newDict[pName];
         });
         return newDict2; // GIF those with the global subject
      }

      if (this.personsDict[filterKeyword] != undefined)
         newDict2[filterKeyword] = newDict[filterKeyword];
      return newDict2; // GIF onlyh one person
   };

   /** Run the gifmaker. If the folder tree has not been scanned, then create an index
  * 
  */
   async gifFolder() {

      if (this.originalPhotosFolder == null) {
         await this.createIndex();
      }

      if (this.originalPhotosFolder == null) {
         this.clearMenu();  // nothing was selected, exit without making GIFs
      } else {

         /**
          * a filtered version of the this.personsDict
          */
         let filteredDict = await this.filtered();
         await disableButtons("Making Gifs");

         // create gif folder
         const ents = await this.originalPhotosFolder.getEntries();
         let newName = getFaceTagsTreeName(this.originalPhotosFolder.name, ents, gifSuffix);
         this.gifEntry = await this.originalPhotosFolder.createFolder(newName);


         // go through all the people that were found and make a GIF for each one.

         let personKeys = Object.keys(filteredDict).sort();
         progressbar.max = personKeys.length

         for (let i = 0; i < personKeys.length && !stopFlag; i++) {
            let personKey = personKeys[i];
            await progressbar.setVal(i);

            const dpi = 72;
            let targetDoc = null;
            // Adobe bug workaround: if the windows is minimized with the minimize button, and the cursor is hovering over the thumbnail in the task bar, the create Document may fail and return null
            while (targetDoc == null && !stopFlag) {
               targetDoc = await xModal(() => app.createDocument({
                  width: gSettings.gifSize,
                  height: gSettings.gifSize,
                  resolution: dpi,
                  fill: "transparent"

               }), { "commandName": "Create Target Document" });
               await new Promise(r => setTimeout(r, 100));  // required to give time to process Cancel Button
            }

            // For each person, there was an entry, one per period.
            // Go through the periods and make a frame in the GIF for each period

            // dictionaries can be unordered so make an ordered array just to be pretty

            let msKeys = Object.keys(filteredDict[personKey]).sort(function (a, b) { return a - b; }
            );

            for (let i = 0; i < msKeys.length && !stopFlag; i++) {

               let person = filteredDict[personKey][msKeys[i]];
               let sourceDoc = await xModal(() => app.open(person.entry), { "commandName": "Opening batched File" });
               await xModal(() => sourceDoc.flatten(), { "commandName": "Flattening" });

               //  With fullPhoto enabled, create a document where the biggest dimension is equal to the gifSize

               if (gSettings.fullPhoto) {
                  let biggestDimension = Math.max(sourceDoc.width, sourceDoc.height);
                  let x = parseInt(gSettings.gifSize * sourceDoc.width / biggestDimension);
                  let y = parseInt(gSettings.gifSize * sourceDoc.height / biggestDimension)
                  await xModal(() => sourceDoc.resizeImage(x, y, dpi), { "commandName": "Resize batched File" });
               } else {

                  // With the full mode off, create a square, twice as large as the person's rectangle,  that can be contained within the document 
                  // positioned so distance from the center point of the person
                  // to the centerpoint of the square is minimized.

                  let s = 2 * person.w;
                  const playRight = sourceDoc.width - s;
                  const playDown = sourceDoc.height - s;
                  const cropLeft = Math.min(playRight, Math.max(0, person.x - person.w));
                  const cropTop = Math.min(playDown, Math.max(0, person.y - person.w));
                  let bounds = { left: cropLeft, top: cropTop, bottom: cropTop + s, right: cropLeft + s };
                  await xModal(() => sourceDoc.crop(bounds), { "commandName": "Crop File" });
                  await xModal(() => sourceDoc.resizeImage(gSettings.gifSize, gSettings.gifSize, dpi), { "commandName": "Resize batched File" });
               }

               await xModal(() => sourceDoc.layers[0].duplicate(targetDoc, constants.ElementPlacement.PLACEATBEGINNING),
                  { "commandName": "Duplicating a layer" });

               await xModal(() => sourceDoc.closeWithoutSaving(), { "commandName": "closeWithoutSaving" });
               await new Promise(r => setTimeout(r, 100));  // required to give time to process Cancel Button
            }

            // turn the layers into a gif and save it. If there are less than 2 layers it seems to be a special case.
            if (!stopFlag) {
               if (targetDoc.layers.length > 2) {
                  await xModal(() => targetDoc.layers.getByName("Layer 1").delete(), { "commandName": "Removing transparent layer" });
                  await this.makeGif();
               }
               let saveEntry = await this.gifEntry.createFile(removeIllegalFilenameCharacters(personKey) + '.gif');
               await xModal(() => targetDoc.saveAs.gif(saveEntry), { "commandName": "saveAs.gif" });
            }

            await xModal(() => targetDoc.closeWithoutSaving(), { "commandName": "closeWithoutSaving" });
         }

         const resultsFolder = await this.gifEntry.createFolder("results");
         await writeErrors(resultsFolder, this.savedMetaData);
         // await writePersons(resultsFolder, this.personsDict);
         // await writeGlobalSubjects(resultsFolder, this.globalSubjects, this.globalFiles);
         await enableButtons();
      }
   };


   /** Create an index of all the face rectangles in the folder tree
  * 
  * @param {*} rootFolder The folder underwhich all files will be processed.
  * @returns 
  */
   async recurseIndex(rootFolder) {

      // process all the files and folders in the rootFolder
      const entries = await rootFolder.getEntries();
      for (let i = 0; (i < entries.length) && (!stopFlag); i++) {
         const entry = entries[i];;

         if (skipThisEntry(entry))
            continue;

         await progressbar.incVal();
         if (entry.isFolder) {
            await this.recurseIndex(entry);
         } else {
            ////////////////////   PAYLOAD START   /////////////////////   
            let [persons, subjects, metaDataErrors, exiftool] = readPersonsFromMetadata(entry);  // persons in the file, with the subject subjects for each person
            this.savedMetaData[entry.nativePath] = { "persons": persons, "subjects": subjects, "metaDataErrors": metaDataErrors, "exiftool": exiftool };
         }
         ////////////////////   PAYLOAD END   /////////////////////    
      }
   };

   async makeGif_actn() {
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
                  animationFrameDelay: gSettings.gifSpeed * (.975 + .05 * Math.random())
               },
               _options: {
                  dialogOptions: "dontDisplay"
               }
            }
         ],
         {}
      );
   }

   /**
  * Grabs all the layers and puts them into a single GIF, with slightly random speed settings.
  */
   async makeGif() {
      await xModal(() => this.makeGif_actn(), { "commandName": "Make GIFs" });
   }
}

module.exports = {
   Gifs
};