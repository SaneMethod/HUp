HUp - HTML5 File Reader/Uploader plugin for jQuery
==================================================

This jQuery plugin allows you to turn any element into a drop target for reading in files, or uploading them.

Files are read and returned within custom events with a configurable read method (ie. readAsDataURL, readAsText, etc.).

Uploads are chunked by default, with a chunk size of 1024*1024 bytes (1 MiB). These settings, amongst others, are
configurable options passed to the plugin.

Usage:
------
[Example](#simple-example)

[Options](#options)

[Events](#events)

###Simple Example:

```javascript
$('#element').hup({options}).on('events', function(event, data){});
```

###Options:

```javascript
    accept:[], // A string or array of extensions or mime-types to accept for reading/uploading
    async:true, // Whether to send files asynchronously
    chunked:true, // Whether to send the file in chunks
    chunk_size:1048576, // Size of each chunk (default 1024*1024)
    input:'', // Input element
    make_dnd:false, // Whether to make the input element handle drag and drop - auto-true if not file input
    max_file_size:10485760,  // Max file size (default 10*1024*1024, 10 MiB)
    read_method:'readAsDataURL', // the read method to use for reading in the file - one of
    // readAsText, readAsBinaryString, readAsDataURL or readAsArrayBuffer
    type:'PUT', // Type of request to use for uploading
    url:false // Url endpoint to send file to - if not specified or false, we read the file and return it
```

######accept
String or Array

Based on the HTML5 [accept specification](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Input#Specifications)
for file inputs. Accepts either a string or an array, with the expected extensions, mime-type categories or mime-types.

The following are all valid examples:

* "wmv, swf, mp4"
* ['wmv', 'swf', 'mp4']
* "video/*"
* "video/mp4, video/x-ms-wmv"
* ['video/*']

Any files whose mime type doesn't match the resulting filter will be rejected. See [Events](#events) for more details.

######async
Boolean

Whether to upload a file asynchronously, or synchronously.

######chunked
Boolean

Whether to upload a file larger than the chunk_size in chunks.

######chunk_size
Number

The size of each file chunk to be uploaded, in bytes.

######input
DOMElement

This will be set automatically when using the plugin to the DOMElement referenced from jQuery. If unwrapping this
plugin, you will need to pass this in manually in the options.

######make_dnd
Boolean

Whether to make the input element drag-and-droppable. Defaults to true for any element that isn't a file input.

######max_file_size
Number

The maximum file size you want to allow uploaded or read, in bytes. Any file larger than this will be rejected. See
[Events](#events) for more details.

######read_method
String

The read method to use for reading in the file - one of readAsText, readAsBinaryString, readAsDataURL or
readAsArrayBuffer.

######type
String

As per jQuery ajax, the type of request method.

######url
String

The relative or absolute url to upload the file to. If not specified, we instead read and return the file.

###Events:

* 'fileListError' - Fires when we've failed to load the list of files selected for read/upload.

```javascript
{state:String, error:String}
```

* 'fileListLoaded' - Fires when the file list has successfully loaded.

```javascript
{state:String, files:FileList}
```

* 'fileSizeError' - Fires when a file is larger than max_file_size.

```javascript
{state:String, error:String}
```

* 'fileTypeError' - Fires when a file is of a type not specified in accept.

```javascript
{state:String, error:String}
```

* 'fileReadError' - Fires when the file reader encounters an error.

```javascript
{state:String, error:String}
```

* 'fileReadProgress' - Fires when there is progress reading a file.

```javascript
{state:String, progress:Number /*(between 0 and 1)*/, file_name:String}
```

* 'fileReadFinished' - Fires when a file has been completely read into memory, and returns the result of the read.

```javascript
{state:String, file_name:String, file_size:Number, file_type:String, read_method:String,
read_result:(String||DataURL||ArrayBuffer)
```

* 'fileReadAll' - Fires when all files in the fileList have been read.

```javascript
{state:String, files:Number /*(number of files read)*/}
```

* 'fileUploadError' - Fires when xhr encounters an error uploading a file.

```javascript
{state:String, error:String}
```

* 'fileUploadProgress' - Fires when there is progress uploading a file.

```javascript
{state:String, file_name:String, progress:Number /*(between 0 and 1)*/}
```

* 'fileUploadPause' - Fires when uploading has been paused (only for chunked uploads).

```javascript
{state:String, current_range:{start:Number, end:Number, total:Number}}
```

* 'fileUploadResume' - Fires when uploading resumes.

```javascript
{state:String, current_range:{start:Number, end:Number, total:Number}}
```

* 'fileUploadFinished' - Fires when upload of a file completes.

```javascript
{state:String, file_name:String, file_size:Number, file_type:String, response:(JSON||{error:String, text:String})}
```

* 'fileUploadAll' - Fires when all uploads are completed.

```javascript
{state:String, files:Number /*(number of files uploaded)*/}
```