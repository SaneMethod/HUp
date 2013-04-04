HUp - HTML5 File Reader/Uploader plugin for jQuery
==================================================

This jQuery plugin allows you to turn any element into a drop target for reading in files, or uploading them (or, if element is a file input (<input type="file">) it simply listens for change on said element, as file inputs are drop targets on most modern browsers by default). 
Files are read and returned within custom events with a configurable read method (ie. readAsDataURL, readAsText, etc.).
Uploads are chunked by default, with a chunk size of 1024*1024 bytes (1MiB). These settings, amongst others, are configurable options passed to the plugin.

Usage:
------

Simple Example:
'''javascript
$('#element').hup({options}).on('events', function(event, data){});
'''

Options:
'''javascript
    async:true, // Whether to send files asynchronously
    chunked:true, // Whether to send the file in chunks
    chunk_size:1048576, // Size of each chunk (default 1024*1024)
    input:'', // Input element
    make_dnd:false, // Whether to make the input element handle drag and drop - auto-true if not file input
    read_method:'readAsDataURL', // the read method to use for reading in the file - one of
    // readAsText, readAsBinaryString, readAsDataURL or readAsArrayBuffer
    type:'PUT', // Type of request to use for uploading
    url:false // Url endpoint to send file to - if not specified or false, we read the file and return it
'''

Events:
* 'fileListError' - Fires when we've failed to load the list of files selected for read/upload
{state:String, error:String}
* 'fileListLoaded' - Fires when the file list has successfully loaded
{state:String, files:FileList}
* 'fileReadError' - Fires when the file reader encounters an error
{state:String, error:String}
* 'fileReadProgress' - Fires when there is progress reading a file
{state:String, progress:Number (between 0 and 1), file_name:String}
* 'fileReadFinished' - Fires when a file has been completely read into memory, and returns the result of the read
{state:String, file_name:String, file_size:Number, file_type:String, read_method:String, read_result:(String||DataURL||ArrayBuffer)
* 'fileReadAll' - Fires when all files in the fileList have been read
{state:String, files:Number (number of files read)}
* 'fileUploadError' - Fires when xhr encounters an error uploading a file
{state:String, error:String}
* 'fileUploadProgress' - Fires when there is progress uploading a file
{state:String, file_name:String, progress:Number (between 0 and 1)}
* 'fileUploadPause' - Fires when uploading has been paused (only for chunked uploads)
{state:String, current_range:{start:Number, end:Number, total:Number}}
* 'fileUploadResume' - Fires when uploading resumes
{state:String, current_range:{start:Number, end:Number, total:Number}}
* 'fileUploadFinished' - Fires when upload of a file completes
{state:String, file_name:String, file_size:Number, file_type:String, response:(JSON||{error:String, text:String})}
* 'fileUploadAll' - Fires when all uploads are completed
{state:String, files:Number (number of files uploaded)}