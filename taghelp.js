
// copywrite 2023 Richard R. Lyman
const txt = [
    // Step 1
    '<p>In Lightroom Classic in the Library Loupe view, a rectangle will appear around each person\'s face.&nbsp;' +
    'If there is no rectangle, then click and drag to draw one.' +
    '</p> ' +
    '<p>Type a name or other text into the box above the rectangle.&nbsp;' +
    'This is the text that will show up as a label for each person.'+
    '</p> ',
    // Step 2
    '<p>The rectangle information must be stored in the photo file. &nbsp;' +
    ' Either, edit a copy in Photoshop with Lightroom adjustments, select "Save Metadata to File or &nbsp;' +
    ' press Ctrl+S (Windows) or Command+S (Mac OS).</p> '+
    '<p>The metadata "RegionList" can be viewed as in Photoshop under File/File Info/ Raw Data</p>'+
    '<meta name="viewport" content="width=device-width, initial-scale=1"> '+
      '<p><img src="MetaData.png" ></p>' +    
    '</p> ',
    // Step 3
    '<p>The next step is to go over to PhotoShop 2024 and load the file. &nbsp;' +
        ' There are numerous ways to do this. '+
        '<ul>' +
            '<li>From Lightroom Classic go to Photoshop - Ctrl + E (Windows) or  Command + E (Mac).</li>' +
            '<li>Open PhotoShop, load the photo, and Run Tagging on the Image</li>'+
            '<li>Open PhotoShop and select "Open Files" to Tag one or more files</li>'+
        '</ul>'+
        'ALWAYS edit a copy of the photo, since accidentally selecting Yes, when prompted to overwrite a file,&nbsp;' +
        'will cause the image with the labels to be saved.</li>' +
    '</p> ',
    // Step 4
    '<p>After control changes, the face tag program will be automatically rerun.' +
        '<ul>'+
            '<li>"Text Color" selects a color for the text. </li>' +
            '<li>"Border Color" is the color around the text.</li>' +
            '<li>To leave a layer for each person, leave "Merge Layers" unchecked.</li>'+
            '<li>After tagging, a border is drawn around the text if "Background Effects" is checked.</li>' +
            '<li>Portrait shows the original photo on the top half and the Person names on the bottom half.</li>' +            
            '<li>"Vertical Position" moves the text label up or down.</li>'+
            '<li>"Font Size" changes the text character sizes.</li>'+
            '<li>"Refresh" refreshes tagging on the image.  This deletes any existing edits!</li>'+
            '<li>"Files" opens a file picker and one or more files can be loaded and tagged.</li>'+
            '<li>"Folders" opens a folder picker. Select the parent folder containing the images. A new folder tree, "Facetags_n"  containing the tagged images will be created under the parent folder.</li>'+            
        '</ul>'+
    '</p> ',
    // Step 5
    '<p>After Tagging the Faces, here are some things to try:' +
        '<ul>' +
            ' <li> Under the Facetags group layer, open the Stroke effects to adjust the type of background. </li>'+
            ' <li> Pick different background effects, trying combinations of size and color.</li>'+            
            ' <li> If "Merge Layers" is unchecked, there will be one layer for each individual,  &nbsp;</li>' +
              'Select one or more of these layers to change color and effects for particular individuals.</li>. '+
            ' <li> Manually merge all the layers into the FaceTags layer via the menu item Layers/Merge Group. &nbsp; '+            
            ' NOTE: Clicking on Refresh will delete all edits by rewinding to the initial history state!</li>' +   
        '</ul>'+    
        '</p>' ,
    // Step 6
    '<p>GIF (Graphical Interchange Format)  files are small slideshows that cycle through the frames showing one photo after another. &nbsp; '+
    ' The GIF maker in this program goes through all your photos, finding all those people who have been identified, then it constructs GIFs, &nbsp; '+
    ' using one photo for each person. The  GIF for an individual, such as “Rick Lyman” is stored in a file “Rick Lyman.gif”. &nbsp; '+
    ' For an examples, go to https://www.uhsclassof65.org/ or https://www.uhsclassof65.org/Clippings/Little-Gifs/' +
    '</p>',
    // Step 7        
    '<p>First build an index. In the File Folder dialog box, choose the root of all you photo files. &nbsp; '+
    '  This analyzes all the files and folders under the foot folder. '+
    '</p>',
     // Step 8
    '<p> The GIFs are square.  \"Big Square\" copies from each photo as large a square as possible centered on the person. If \"Big Square\" is not selected &nbsp; '+
    ' just the person\'s face is copied into the GIF. ' + 
    '</p>',
    // Step 9
    '<p>Now select which people to make GIFs for.  If a single person’s name is selected, then only one GIF will be made. &nbsp; '+
    '  If a keyword has been applied to a number of photos, then GIFs will be made for all the people who were in those photos. &nbsp; ' +
    '  For instance, if all the senior class mugshots have “Senior Class” keyword, the selecting “Senior Class” from  &nbsp; '+
    ' the drop down list will cause GIFs to made of all people who were in the senior class.'+
    '</p>',
    // Step 10
    '<p>The GIF size is the number of pixels on a side for the resulting GIFs. &nbsp; '+
    'The Frame Speed is the number of seconds that each frame will display. A small random perturbation is applied&nbsp; '+
    ' so that a matrix of GIFs will blink randomly. See an example at https://www.uhsclassof65.org/Clippings/Little-Gifs/'+
    '</p>',
    // Step 11
    '<p>After selecting the keyword, GIF size, and GIF speed parameters, push the Make GIFS button to start the process. '+
    'The output GIFs are placed in a folder underneath the root folder with the same name as the root folder'+
    ' with “-gifs_1” appended to the name. On each run of the program, it detects whether any of the”-gif”'+
    ' folders exist and makes a new one. For instance a second run would have the name “-gifs_2” appended'+
    ' to the root folder name.  This way, there is never a chance of writing over the source photos or previous generated GIFs.'+
    '</p>',
    // Step 12
    '<p>Problems:'+
        '<ul>'+
            '<li>"LightRoom does not always write the identified person to the files. '+
                'If the photo is edited in LightRoom, the person in lightroom rectangle drawn on their face'+
                ' may be different than the person in stored with the photo in its metadata. '+
        '</ul>'+
     '</p>'
];
function helpHtml(i) {
    let y = "";
     if(i<5)
        y= '<sp-button class="btnTest"> Try It </sp-button> ' ;
     let x =/*  '<sp-heading>Step &nbsp;' + (i + 1) + '</sp-heading>' + */
        '<sp-body Width="600px" Height="500px">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1"> '+
        '<style> '+
            'img { '+
                'display: block; '+ 
                'margin-left: auto; '+ 
                'margin-right: auto;'+
            '}'+
            'btnCancel { }   '+        
            'btnNext { }'+
            'btnPrev { }'+
            'btnTest { }  '+ 
            '.container { '+
                'display: flex; '+
                'justify-content: space-between; '+
            '} '+
            '</style> '+
         '<p><img src="Step' + (i + 1) + '.png"  ></p>' +
        txt[i] +
        '</sp-body><footer class="container">' +
            '<sp-button class="btnPrev">Prev</sp-button>'+           
            '<sp-button class="btnCancel">Cancel</sp-button>'+  
            y +                       
            '<sp-button class="btnNext"> Next </sp-button> ' +  
        '</footer>';
    return x;
};
/**
 * Makes an array of Dialog HTML elements, one for each help page
 * @returns 
 *  */
function makeHelpDialogs() {
    for (let i = 0; i < txt.length; i++) {
        let newDialog = document.createElement('DIALOG');
        newDialog.innerHTML = helpHtml(i);
        document.body.appendChild(newDialog);               
        dialogs.push(newDialog);
    }

    function dialogE(evt) { return evt.target.parentNode.parentNode }
    document.getElementsByClassName("btnCancel").forEach((bNode) => {
        bNode.addEventListener("click", evt => {
        dialogE(evt).close();  
        });
    });

     document.getElementsByClassName("btnNext").forEach((bNode) => {        
        bNode.addEventListener("click", evt => {
        if (dialogE(evt).nextSibling != null){
            dialogE(evt).close();  
            dialogE(evt).nextSibling.uxpShowModal();
        }
        });
    });

    document.getElementsByClassName("btnPrev").forEach((bNode) => {        
        bNode.addEventListener("click", evt => {  
        if (dialogE(evt).previousSibling.nodeName == "DIALOG") {
            dialogE(evt).close();     
            dialogE(evt).previousSibling.uxpShowModal();
        }            
        });
    });
 
    document.getElementsByClassName("btnTest").forEach((bNode) =>  {        
        bNode.addEventListener("click", evt => {
        dialogE(evt).close(); 
        tryIt();
        });
    });
};


/**
 * Loads an example file and runs the Face Tag
 *  */ 
async function tryIt() {

    const pluginFolder = await fs.getPluginFolder();
    const theTemplate = await pluginFolder.getEntry("1stCommunion1954.jpg");
  
    await app.open(theTemplate);
    await tagSingleFile();
}

module.exports = {
    makeHelpDialogs
}