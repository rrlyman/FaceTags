
// copywrite 2023 Richard R. Lyman

const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { getFaceTagsTreeName, skipThisEntry, countFiles } = require("./tagUtils.js");

class Gifs {
   constructor() {

      /**
       * this.personsDict is a one to many dictionary, where the key is the person's name, 
       * Then there is one entry for each days of the person rectangles that were found.
       * e.g {person.name: {periods: person}}   ( definition of the person's rectangle such as -13: personRick, -12: personBob etc
       * periods is the number of gSettings.days periods since 1970, fpr the year 1957 would be -13
        */
      this.personsDict = {};

      /**  
       * this.subjectDict is a one to many dictionary, where the key is a subject, such as "reunion" and the many is an array of the names of persons.
       * The entry is an array of persons that had at least one photo in which they appeared that also had the subject, "reunion".
       * e.g {subject: [personRick, personBob]}
       * */
      this.subjectDict = {};   // keys = subjects that are not person names, entries = person names   

      this.iFiles = 0;
      this.nFiles = 0;
      this.originalPhotosFolder = null;  // if not null,  then an index has been built
   }

   // checkKeywords() {
   //    for (let key in this.subjectDict) {
   //       for (let n = 0; n < this.subjectDict[key].length; n++) {
   //          if (this.personsDict[key] != null) {
   //             alert(" bad keyword " + key + " in file " + personIndex[key].entry.name);
   //             //this.subjectDict[key][n] = this.subjectDict[key][n] + this.personsDict[key].entry.name;
   //          }
   //       }
   //    }
   // }

   /**
    * Opens up a folder dialog box to select top folder to process
    * Makes a new folder called this.originalPhotosFolder_n and builds a tree under it that duplicates
    * the source tree. Populates it with tagged photos of the originals.
    * 
    * Annotates each file with the face tag labels for each person found in the file metadata 
    * 
    * @returns none
    */
   async createIndex() {

      this.originalPhotosFolder = await fs.getFolder();
      if (this.originalPhotosFolder != null) {  // null if user cancels dialog              

         // gather all the years of the each person
         this.nFiles = await countFiles(this.originalPhotosFolder);
         await disableButtons("Creating an Index");  // only enable the Cancel button 
         this.personsDict = {};  // keys = person names, entries = rectange definitions and subjects
         this.subjectDict = {};   // keys = subjects, entries = person names

         await this.recurseIndex(this.originalPhotosFolder);

         // check for illegal keywords
         // checkKeywords();

         await disableButtons("Processing Index");

         // clean out the keyword list on the panel
         let menu = document.getElementById("dropMenu");
         while (menu.options.length > 0)
            menu.options[0].remove();
         filterKeyword = "";
         let subjects = Object.keys(this.subjectDict).sort();

         // purge the this.subjectDict of any keywords that are also persons
         // This occurs when there is a person name in a photo that but there is no person rectangle for tem.
         for (let iSubject in subjects) {
            if (this.personsDict[subjects[iSubject]] != undefined) {
               delete this.subjectDict[subjects[iSubject]];
            }
         }

         // sort them so the dropdown is nicely sorted
         subjects = Object.keys(this.subjectDict).sort();
         for (let iSubject in subjects) {
            const item = document.createElement("sp-menu-item");
            item.textContent = subjects[iSubject];
            menu.appendChild(item);
         }

         menu.appendChild(document.createElement("sp-menu-divider"));

         // now add anyone to the dropdown who has a person rectangle

         let personNames = Object.keys(this.personsDict).sort();
         for (let i = 0; i < personNames.length; i++) {
            const item = document.createElement("sp-menu-item");
            item.textContent = personNames[i];
            menu.appendChild(item);
         }
         await enableButtons();
      }
   };

   /* TBD
   Use the entire photo.  
      TAGS The text is all the keywords found on that photo. The entire photo is always used. 
          Non-person keywords will show up as a title at the bottom
      GIFS The entire photo is placed in the frame.
   Do not use the entire photo
      TAGS Each face rectangle is indiviually tagged. The entire photo is always used. 
         Non-person keywords are not shown
      GIFS The entire photo is placed in the frame.
   Use all photos whe selected people(s) keywords have at least one occurance of a non people keyword
      TAGS e.g. all memember of the "UHS Seniors" will be labeled anywhere in the entire photo tree
      GIFS Make GIFs out of all people who have a selected label anywhere in the entire photo tree
   Use only photos that have the selected keywords
      TAGs, only label photos that exactly match the keywords selected
      GIFs, only GIF photos that exactly match the keywords selected (this makes a slideshow out of keyworded entries) which is a useful feature)
   */


   /** If the selected filterKeyword from the drop box is "" then use the this.personsDict as the source of the names to GIF
    * If the selected filterKeyword is in the this.subjectDict, the use all of the names for filterKeyword in the this.subjectDict.
    * If the selected filtereyword is in the this.personsDict, GIF only that person
    * 
    * @param {*} newDict  a filtered version of the this.personsDict, unsorted!
    */
   async filtered() {

      let newDict = {};
      // create a dictionary of person names each of which
      // has an value of another dictionary with an entry for each time period
      // the value of which is the filename, person name, biggest area face rectange for the period, etc

      const msPerPeriod = 1000 * 60 * 60 * 24 * gSettings.days;
      await disableButtons("Applying Options");

      // filters the array of times by only including one time in a given time perion in the newDict
      for (let personKey in this.personsDict) {
         this.personsDict[personKey].forEach((person) => {

            if (!(person.name in newDict))
               newDict[person.name] = {};

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

      if (filterKeyword == "")
         return newDict;  // unsorted ??

      let newDict2 = {}

      // sticks anyone in the new dictionary that had the picked subject
      if (this.subjectDict[filterKeyword] != undefined) {
         this.subjectDict[filterKeyword].forEach((pName) => {
            if (newDict[pName] != undefined)
               newDict2[pName] = newDict[pName];
         });
         return newDict2;
      }
      // sticks anyone in the new dictionary that matches the picked name
      if (this.personsDict[filterKeyword] != undefined)
         newDict2[filterKeyword] = newDict[filterKeyword];
      return newDict2;
   };

   /** Run the Gifmaker. If the folder tree has not been scanned, then create and index
    *  Gif everyone, unless a keyword has been selected in the dropDown menu
    * 
    */
   async gifBatchFiles() {
      // if the index has already been created, then skip index creation
      if (this.originalPhotosFolder == null) {
         await this.createIndex();
      }
      /**
       * a filtered version of the this.personsDict
       */
      let filteredDict = await this.filtered();
      await disableButtons("Making Gifs");

      // create gif folder
      const ents = await this.originalPhotosFolder.getEntries();
      let newName = getFaceTagsTreeName(this.originalPhotosFolder.name, ents, gifSuffix);
      let gifFolder = await this.originalPhotosFolder.createFolder(newName);

      // go through all the people that were found and make a GIF for each one.

      let iPerson = 0;
      let nPersons = Object.keys(filteredDict).length;

      for (let personKey in filteredDict) {
         await progressBar((100 * iPerson++ / nPersons).toString());

         if (stopTag)
            break;
         const dpi = 72;
         let targetDoc =  await executeAsModal(() => app.createDocument({
            width: gSettings.gifSize, 
            height: gSettings.gifSize, 
            resolution: dpi, 
            fill: "transparent"
         
         }), { "commandName": "Make target" });
               
         // For each person, there was an entry, one per period.
         // Go through the periods and make a frame in the GIF for each period

         // dictionaries can be unordered so make an ordered array

         let msKeys = Object.keys(filteredDict[personKey]).sort(function (a, b) { return a - b; }
         );

         for (let i = 0; i < msKeys.length && !stopTag; i++) {

            // make the source image the same size as the gif
            let person = filteredDict[personKey][msKeys[i]];
            let sourceDoc = await executeAsModal(() => app.open(person.entry), { "commandName": "Opening batched File" });
            await executeAsModal(() => sourceDoc.flatten(), { "commandName": "Flattening" });

            //  With fullPhoto enabled, create a document where the biggest dimension is equal to the gifSize

            if (gSettings.fullPhoto) {
               let biggestDimension = Math.max(sourceDoc.width, sourceDoc.height);
               await executeAsModal(() => sourceDoc.resizeImage(parseInt(gSettings.gifSize * sourceDoc.width / biggestDimension),
                  parseInt(gSettings.gifSize * sourceDoc.height / biggestDimension), dpi), { "commandName": "Resize batched File" });
               // await executeAsModal(() => sourceDoc.resizeCanvas(gSettings.gifSize, gSettings.gifSize), { "commandName": "Resize batched File" });

            } else {

               // With the full mode off, create a square, twice as large as the person's rectangle,  that can be contained in the document 
               // positioned so distance from the center point of the person
               // to the centerpoint of the square is minimized.

               let s = 2 * person.w;
               const centerX = s / 2;  // the center of the new square
               const centerY = s / 2;
               const playRight = sourceDoc.width - s;
               const playDown = sourceDoc.height - s;
               const moveRight = Math.min(playRight, Math.max(0, person.x - centerX));
               const moveDown = Math.min(playDown, Math.max(0, person.y - centerY));
               let bounds = { left: moveRight, top: moveDown, bottom: moveDown + s, right: moveRight + s };
               await executeAsModal(() => sourceDoc.crop(bounds), { "commandName": "Crop File" });
               await executeAsModal(() => sourceDoc.resizeImage(gSettings.gifSize, gSettings.gifSize, dpi), { "commandName": "Resize batched File" });
            }

            await executeAsModal(() => sourceDoc.layers[0].duplicate(targetDoc), { "commandName": "Make new layer" });
            await executeAsModal(() => sourceDoc.closeWithoutSaving(), { "commandName": "Closing" });
            sourceDoc = null;

            await new Promise(r => setTimeout(r, 100));    // required to give time to process Cancel Button
         }

         // turn the layers into a gif and save it

         if (targetDoc.layers.length > 1) {
            await executeAsModal(() => targetDoc.layers.getByName("Layer 1").delete(), { "commandName": "Removing transparent layer" });
            await this.makeGif();
         }
         let saveEntry = await gifFolder.createFile(personKey + '.gif');
         await executeAsModal(() => targetDoc.saveAs.gif(saveEntry), { "commandName": "Saving" });
         await executeAsModal(() => targetDoc.closeWithoutSaving(), { "commandName": "Closing" });
      }
      await progressBar(0);
      await enableButtons();
   };


   /** Create an index of all the face rectangles in the folder tree
    * 
    * @param {*} rootFolder The folder underwhich all files will be processed.
    * @returns 
    */
   async recurseIndex(rootFolder) {

      // process all the files and folders in the rootFolder
      const entries = await rootFolder.getEntries();
      for (let i = 0; (i < entries.length) && (!stopTag); i++) {
         const entry = entries[i];;
         await progressBar((100 * ++this.iFiles / this.nFiles).toString());

         if (skipThisEntry(entry))
            continue;

         if (entry.isFolder) {
            await this.recurseIndex(entry);
         } else {
            ////////////////////     PAYLOAD START     /////////////////////     
            let [persons, subjects] = readPersonsFromMetadata(entry);  // persons in the file, with the subject keywords for each person


            // a subject in this.subjectDict has an entry for each person that had at least one instance of that subject

            persons.forEach((person) => {
               subjects.forEach((subject) => {
                  if (this.subjectDict[subject] == undefined)
                     this.subjectDict[subject] = Array(0);
                  this.subjectDict[subject].push(person.name);
               });
               if (this.personsDict[person.name] == undefined) {
                  this.personsDict[person.name] = Array(0);
               }
               this.personsDict[person.name].push(person);

            }
            )
         }
         ////////////////////     PAYLOAD END     /////////////////////                  

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
      await executeAsModal(() => this.makeGif_actn(), { "commandName": "Action Commands" });
   }
}
module.exports = {
   Gifs
};