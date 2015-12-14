/**
 * Copyright (c) 2013 Christopher Keefer. All Rights Reserved.
 *
 * jQuery plugin for reading in files or uploading them with the HTML5 file api and xhr2.
 */
"use strict";
(function($){
    var filters = {},
        fileTypes = [];
    /**
     * Populate the filters and fileTypes object and array, with the former containing a mapping between
     * file extensions and their mime types, and the latter the mimetypes themselves.
     */
    (function(mimetypes){
        var mimes = mimetypes.split(/,/),
            exts = [];

        for (var i=0, len=mimes.length; i < len; i+=2)
        {
            fileTypes.push(mimes[i]);
            exts = mimes[i+1].split(/ /);
            for (var j=0, jlen = exts.length; j < jlen; j++)
            {
                filters[exts[j]] = mimes[i];
            }
        }
    })(
            "application/msword,doc dot,application/pdf,pdf,application/pgp-signature,pgp,application/postscript," +
            "ps ai eps,application/rtf,rtf,application/vnd.ms-excel,xls xlb,application/vnd.ms-powerpoint," +
            "ppt pps pot,application/zip,zip,application/x-shockwave-flash,swf swfl,application/x-javascript,js," +
            "application/json,json,audio/mpeg,mpga mpega mp2 mp3,audio/x-wav,wav,audio/mp4,m4a,image/bmp,bmp," +
            "image/gif,gif,image/jpeg,jpeg jpg jpe,image/photoshop,psd,image/png,png,image/svg+xml,svg svgz," +
            "image/tiff,tiff tif,text/plain,asc txt text diff log,text/html,htm html xhtml,text/css,css,text/csv," +
            "csv,text/rtf,rtf,video/mpeg,mpeg mpg mpe m2v,video/quicktime,qt mov,video/mp4,mp4,video/x-m4v,m4v," +
            "video/x-flv,flv,video/x-ms-wmv,wmv,video/avi,avi,video/webm,webm,video/3gpp,3gp,video/3gpp2,3g2," +
            "application/octet-stream,exe"
        );
    /**
     * Construct html5 reader/uploader.
     * @param {Object} options
     * @constructor
     */
    function Hup(options){
        this.init(options);
    }

    /**
     * Set options, listen for events on input element that indicate we should read/upload selected file(s).
     * @param options
     */
    Hup.prototype.init = function(options)
    {
        var that = this;

        this.options = $.extend({
            accept:[], // A string or array of extensions or mime-types to accept for reading/uploading
            async:true, // Whether to send file(s) asynchronously
            chunked:true, // Whether to send or read the file(s) in chunks
            chunk_size:1048576, // Size of each chunk (default 1024*1024, 1 MiB)
            input:'', // Input element - this is set automatically when using HUp in its jQuery plugin form.
            make_dnd:false, // Whether to make the input element handle drag and drop - auto-true if not file input
            max_file_size:0,// Max file size - 0 means no max size
            read_method:'readAsDataURL', // the read method to use for reading in the file(s) - one of
            // readAsText, readAsBinaryString, readAsDataURL or readAsArrayBuffer
            type:'PUT', // Type of request to use for uploading
            url:false // Url endpoint to send file to - if not specified or false, we read and return the file(s)
        }, options);

        this.input = $(this.options.input);
        this.options.accept = this.acceptFilters(this.options.accept);

        if (this.options.make_dnd || !this.isFileInput(this.input))
        {
            this.options.make_dnd = true;
            this.input.off('dragover').on('dragover', function(event){
                event = event.originalEvent;
                that.handleDragover(event);
            });
        }
        this.input.off('drop change').on('drop change', function(event){
            event = event.originalEvent;
            that.handleSelect(event);
        });
    };

    /**
     * Translate the accept string or array into an array of mime types, based on the mime types in filters.
     * Input should look like the expected extensions:
     * "swf, wmv, mp4" or ['swf', 'wmv', 'mp4']
     * Or like mime type categories, or the mime types themselves:
     * "application/*, application/pdf" or ['image/*', 'plain/text']
     * @param accept
     */
    Hup.prototype.acceptFilters = function(accept){
        var mimes = [],
            mime,
            fileType;

        // Ensure accept is an array of extensions or mime types
        if (typeof accept === 'string' || accept instanceof String)
        {
            accept = accept.split(/,/);
        }
        for (var i=0, len = accept.length; i < len; i++)
        {
            mime = accept[i].trim().split(/\//);
            if (mime.length > 1)
            {
                if (mime[1] === '*')
                {
                    // Every mime-type that begins with mime[0] now needs to be pushed into the mimes array
                    for (var j=0, jlen = fileTypes.length; j < jlen; j++)
                    {
                        fileType = fileTypes[j].split(/\//);
                        if (mime[0] === fileType[0]) mimes.push(fileTypes[j]);
                    }
                } else {
                    // Pass the mime type through unmolested
                    mimes.push(mime.join('/'));
                }
            } else {
                // Only an extension has been specified - map to the mime type
                if (mime[0] in filters) mimes.push(filters[mime[0]]);
            }
        }
        return mimes;
    };

    /**
     * Return whether the passed element is an input of type file.
     * @param input Element to check.
     * @returns {boolean}
     */
    Hup.prototype.isFileInput = function(input){
        return (input[0].tagName === 'INPUT' && /file/i.test(input[0].getAttribute('type')));
    };

    /**
     * Handle the dragging of file(s) to a target, preventing the rejection of the dragover.
     * @param event
     */
    Hup.prototype.handleDragover = function(event){
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
    };

    /**
     * Handle the selection of files to upload via an input or drag and drop to a target.
     * @param event
     */
    Hup.prototype.handleSelect = function(event){
        var files;

        if (this.options.make_dnd)
        {
            event.preventDefault();
            event.stopPropagation();
            files = event.dataTransfer.files;
        }
        else
        {
            files = event.target.files;
        }
        if (!files.length)
        {
            this.input.trigger(Hup.state.FILE_LIST_ERROR, {
                state:Hup.state.FILE_LIST_ERROR,
                error:'No files found in file list; no files were selected.'
            });
            return;
        }
        this.input.trigger(Hup.state.FILE_LIST_LOADED, {state:Hup.state.FILE_LIST_LOADED, files:files});

        this.processFiles(files, this.options.url);
    };

    /**
     * Process the files in the fileList, uploading them if a url is specified, otherwise reading them into
     * memory and passing them on to be used in the browser.
     * @param files
     * @param upload
     */
    Hup.prototype.processFiles = function(files, upload){
        var that = this,
            processed = 0,
            accept = this.options.accept,
            accepted = false,
            maxSize = this.options.max_file_size,
            fprocess;

        this.fprocessors = [];

        for (var i=0, len = files.length; i < len; i++)
        {
            // Check file against mime accept restrictions if any restrictions are set
            if (accept.length)
            {
                accepted = false;
                for (var j=0, jlen = accept.length; j < jlen; j++)
                {
                    accepted = (files[i].type === accept[j]);
                    if (accepted) break;
                }
                if (!accepted)
                {
                    this.input.trigger(Hup.state.FILE_TYPE_ERROR, {
                        state:Hup.state.FILE_TYPE_ERROR,
                        file_name:files[i].name,
                        error:'File type is '+files[i].type+', accepted types are '+accept.join(',')+'.'
                    });
                    continue;
                }
            }
            // Check file against size restrictions
            if (maxSize && files[i].size > maxSize)
            {
                this.input.trigger(Hup.state.FILE_SIZE_ERROR, {
                    state:Hup.state.FILE_SIZE_ERROR,
                    file_name:files[i].name,
                    error:'File size is '+files[i].size+', max file size is '+maxSize+'.'
                });
                continue;
            }
            // Create new DeferXhr or DeferReader and listen on its progression and completion to fire the appropriate
            // events for interested listeners on our input
            fprocess = (upload) ? new DeferXhr(this.options, files[i]) :
                new DeferReader(this.options, files[i]);

            fprocess.promise.progress(function(progress){
                that.input.trigger(progress.state, progress);
            }).done(function(res){
                that.input.trigger(res.state, res);
                processed++;
                if (processed >= len)
                {
                    if (upload)
                    {
                        that.input.trigger(Hup.state.FILE_UPLOAD_ALL, {state:Hup.state.FILE_UPLOAD_ALL, files:len});
                        return;
                    }
                    that.input.trigger(Hup.state.FILE_READ_ALL, {state:Hup.state.FILE_READ_ALL, files:len});
                }
            }).fail(function(res)
            {
                that.input.trigger(res.state, res);
            });
            this.fprocessors.push(fprocess);
        }
    };

    /**
     * Pause any in progress, chunked uploads/file reads. If pauseList is specified,
     * elements should be either the names of the files or the index in which they were returned in the files
     * list returned from the FILE_LIST_LOADED event. Can provide only a single string or number if only a single
     * upload/read needs to be paused.
     * @param {Array|number|string|boolean|undefined} pauseList
     */
    Hup.prototype.pause = function(pauseList){
        pauseList = (!pauseList) ? false : Array.isArray(pauseList) ? pauseList : [pauseList];

        this.fprocessors.forEach(function(fprocess, idx){
            if (!pauseList)
            {
                fprocess.pause();
                return;
            }
            if (pauseList.indexOf(idx) !== -1 || pauseList.indexOf(fprocess.file.name) !== -1)
            {
                fprocess.pause();
            }
        });
    };

    /**
     * Resume any in progress, paused, chunked uploads/file reads, following the same rules for pauseList as
     * specified for pause.
     * @see Hup.prototype.pause
     * @param {Array|number|string|boolean|undefined} pauseList
     */
    Hup.prototype.resume = function(pauseList){
        pauseList = (!pauseList) ? false : Array.isArray(pauseList) ? pauseList : [pauseList];

        this.fprocessors.forEach(function(fprocess, idx){
            if (!pauseList)
            {
                fprocess.resume();
                return;
            }
            if (pauseList.indexOf(idx) !== -1 || pauseList.indexOf(fprocess.file.name) !== -1)
            {
                fprocess.resume();
            }
        });
    };

    /**
     * Convenience function for the reassembly of a file read in chunks as a data url, and returns a single
     * dataURL base64 encoded string.
     *
     * Expects either an array containing all of the base64 strings to be used to reassemble the dataURL, in the
     * correct order, or the strings can be specified as parameters, in the correct order for reassembly (that is,
     * in the same order they were output by DeferReader).
     * @param {Array|String} parts
     * @returns {String}
     */
    Hup.prototype.reassembleChunkedDataURL = function(parts){
        var dataURL;

        if (arguments.length > 1) parts = Array.prototype.slice.call(arguments);
        dataURL = parts[0];
        for (var i=1, len=parts.length; i < len; i++){
            dataURL += parts[i].split(',')[1];
        }
        return dataURL;
    };

    /**
     * Custom events we'll trigger on our input element at the appropriate times.
     * @type {{FILE_LIST_ERROR: string, FILE_LIST_LOADED: string, FILE_TYPE_ERROR: string, FILE_SIZE_ERROR: string,
     * FILE_READ_ERROR: string, FILE_READ_PROGRESS: string, FILE_READ_FINISHED: string, FILE_READ_ALL: string,
     * FILE_UPLOAD_ERROR: string, FILE_UPLOAD_PROGRESS: string, FILE_UPLOAD_PAUSE: string,
     * FILE_UPLOAD_RESUME: string, FILE_UPLOAD_FINISHED: string, FILE_UPLOAD_ALL: string}}
     */
    Hup.state = {
        FILE_LIST_ERROR:'fileListError',
        FILE_LIST_LOADED:'fileListLoaded',
        FILE_TYPE_ERROR:'fileTypeError',
        FILE_SIZE_ERROR:'fileSizeError',
        FILE_READ_ERROR:'fileReadError',
        FILE_READ_PROGRESS:'fileReadProgress',
        FILE_READ_FINISHED:'fileReadFinished',
        FILE_READ_PAUSE:'fileReadPause',
        FILE_READ_RESUME:'fileReadResume',
        FILE_READ_ALL:'fileReadAll',
        FILE_UPLOAD_ERROR:'fileUploadError',
        FILE_UPLOAD_PROGRESS:'fileUploadProgress',
        FILE_UPLOAD_PAUSE:'fileUploadPause',
        FILE_UPLOAD_RESUME:'fileUploadResume',
        FILE_UPLOAD_FINISHED:'fileUploadFinished',
        FILE_UPLOAD_ALL:'fileUploadAll'
    };

    /**
     * Deferred wrapper for xhr upload.
     * @param options
     * @param file
     * @returns {Object} promise The deferred promise object.
     * @constructor
     */
    function DeferXhr(options, file){
        this.defer = $.Deferred();
        this.promise = this.defer.promise();
        this.file = file;
        this.options = options;
        this.paused = false;
        this.progress = 0;
        this.time = {start:0, end:0, speed:0}; // Speed is measured in bytes per second
        this.xhr = new XMLHttpRequest();

        if (this.options.chunked)
        {
            this.start = 0;
            this.end = Math.min(this.start+this.options.chunk_size, this.file.size);
        }

        this.xhr.addEventListener('load', this.complete.bind(this), false);
        this.xhr.upload.addEventListener('progress', this.uploadProgress.bind(this), false);
        this.xhr.upload.addEventListener('error', this.uploadError.bind(this), false);

        this.upload();

        return this;
    }

    /**
     * Carry out the xhr upload, optionally chunked.
     */
    DeferXhr.prototype.upload = function(){
        this.time.start = +new Date();

        this.xhr.open(this.options.type, this.options.url, this.options.async);
        this.xhr.setRequestHeader('Accept', 'application/json');
        this.xhr.setRequestHeader('X-File-Name', encodeURIComponent(this.file.name));
        this.xhr.setRequestHeader('X-File-Type', this.file.type);

        if (this.options.chunked)
        {
            this.xhr.overrideMimeType('application/octet-stream');
            this.xhr.setRequestHeader('Content-Range', 'bytes '+this.start+"-"+this.end+"/"+this.file.size);
            this.xhr.send(this.file.slice(this.start, this.end));
        }
        else
        {
            this.xhr.overrideMimeType((this.file.type || 'application/octet-stream'));
            this.xhr.send(this.file);
        }
    };

    /**
     * Report on the upload progress, as a number between 0 and 1, modifying the progress if we're uploading a
     * file in chunks to report on the progress as a percentage of file upload and total chunks uploaded.
     * @param event
     */
    DeferXhr.prototype.uploadProgress = function(event){
        if (event.lengthComputable)
        {
            this.progress = (event.loaded/event.total);
            if (this.options.chunked)
            {
                this.progress *= (this.end/this.file.size);
            }
            this.time.end = +new Date();
            this.time.speed = (this.file.size*this.progress)/(this.time.end-this.time.start)*1000;
            console.log('time:', this.time.end-this.time.start, 'speed:', this.time.speed, 'progress:', this.progress);
            this.defer.notify({state:Hup.state.FILE_UPLOAD_PROGRESS, file_name:this.file.name, speed:this.time.speed,
                progress:this.progress});
        }
    };

    /**
     * Call reject on the defer for this DeferXhr object, passing the details back to any subscribed event listeners.
     * @param event
     */
    DeferXhr.prototype.uploadError = function(event){
        this.defer.reject({state:Hup.state.FILE_UPLOAD_ERROR, file_name:this.file.name, error:event});
    };

    /**
     * Called when we've completed an upload (full file or chunk). If full file, or we've reached the last chunk,
     * the upload is complete. Otherwise, we calculate the next chunk offsets and, if the upload isn't paused,
     * upload it.
     */
    DeferXhr.prototype.complete = function(){
        this.time.end = +new Date();
        if (!this.options.chunked || this.end == this.file.size)
        {
            this.uploadComplete();
            return;
        }

        this.defer.notify({state:Hup.state.FILE_UPLOAD_PROGRESS, file_name:this.file.name,
            response:this.parseResponse(), progress:this.progress});

        this.start = this.end;
        this.end = Math.min(this.start+this.options.chunk_size, this.file.size);

        if (!this.paused)
        {
            this.upload();
        }
    };

    /**
     * Called when the full file has been uploaded.
     */
    DeferXhr.prototype.uploadComplete = function(){
        this.defer.resolve({state:Hup.state.FILE_UPLOAD_FINISHED, file_name:this.file.name,
            file_size:this.file.size, file_type:this.file.type,
            response:this.parseResponse()});
    };

    /**
     * Try to parse the response as a JSON, and on failure return the error and the plaintext.
     * @returns {Object}
     */
    DeferXhr.prototype.parseResponse = function()
    {
        var response;
        try{
            response = JSON.parse(this.xhr.responseText);
        }catch(e){
            response = {error:e, text:this.xhr.responseText};
        }
        return response;
    };

    /**
     * Pause the upload - that is, after the current chunk is finished uploading, cease uploading chunks until
     * resume is called. For obvious reasons, this only works with chunked uploads.
     * If the state of the deferred object is not pending (that is, is either already resolved or rejected),
     * return early - we won't attempt to pause an upload that's finished or failed.
     */
    DeferXhr.prototype.pause = function(){
        if (this.defer.state() !== 'pending' || !this.options.chunked) return;
        this.paused = true;
        this.defer.notify({
            state:Hup.state.FILE_UPLOAD_PAUSE, file_name:this.file.name,
            current_range:{start:this.start, end:this.end, total:this.file.size}
        });
    };

    /**
     * Resume the upload if paused (works for chunked uploads only).
     */
    DeferXhr.prototype.resume = function(){
        if (this.options.chunked && this.paused)
        {
            this.paused = false;
            this.defer.notify({
                state:Hup.state.FILE_UPLOAD_RESUME, file_name:this.file.name,
                current_range:{start:this.start, end:this.end, total:this.file.size}
            });
            this.upload();
        }
    };

    /**
     * Deferred wrapper for file reader.
     * @param {Object} options
     * @param {File|Blob} file
     * @returns {Object} promise The Deferred promise object
     * @constructor
     */
    function DeferReader(options, file){
        this.options = options;
        this.defer = $.Deferred();
        this.promise = this.defer.promise();
        this.reader = new FileReader();
        this.file = file;
        this.read_method = this.options.read_method;
        this.paused = false;
        this.progress = 0;

        if (this.options.chunked)
        {
            this.start = 0;
            this.end = this.calculateChunkEnd();
        }

        this.listen();
        this.readFile();

        return this;
    }

    /**
     * Calculate what the value of this.end should be when the file read is chunked, as special handling is needed
     * when we're using the 'readAsDataURL' read_method to align reads on multiples of 6, as a result of how base64
     * encoding works (that is, each character encodes 6 bits of information - if we fail to align the chunks with a
     * multiple of 6, the base64 beyond the first chunk will end up represented in a way that cannot be trivially
     * combined with the initial chunk).
     */
    DeferReader.prototype.calculateChunkEnd = function(){
        var end = Math.min(this.start+this.options.chunk_size, this.file.size);

        if (this.read_method === 'readAsDataURL' && end !== this.file.size){
            end -= end % 6;
        }
        return end;
    };


    /**
     * Read the entire file or a slice thereof, depending on the value of options.chunked and chunk_size.
     */
    DeferReader.prototype.readFile = function(){
        if (this.options.chunked)
        {
            this.reader[this.read_method](this.file.slice(this.start, this.end, this.file.type));
            return;
        }
        this.reader[this.read_method](this.file);
    };

    /**
     * Report on the file read progress, as a number between 0 and 1, modifying the progress if we're reading a
     * file in chunks to ensure that we're reporting the total percentage of the file read, not just the percentage
     * of the current chunk read (see also readComplete).
     * @param event
     */
    DeferReader.prototype.readProgress = function(event){
        var progress = this.progress;

        if (event.lengthComputable)
        {
            progress = event.loaded/event.total;
            if (this.options.chunked)
            {
                progress *= (this.end/this.file.size);
            }
            this.defer.notify({state:Hup.state.FILE_READ_PROGRESS, file_name:this.file.name, progress:progress});
        }
        this.progress = progress;
    };

    /**
     * On read completion, if we're reading in chunks, if we've reached the last chunk, report on file read completion.
     * If there are remaining chunks, report on progress and read the next chunk.
     * Otherwise if we're reading the entire file in one go, report on file read completion.
     * @param event
     */
    DeferReader.prototype.readComplete = function(event){
        if (event.target.readyState == FileReader.DONE && (!this.options.chunked || this.end == this.file.size))
        {
            this.defer.resolve({
                state:Hup.state.FILE_READ_FINISHED, file_name:this.file.name, file_size:this.file.size,
                file_type:this.file.type, read_method:this.read_method, read_result:event.target.result
            });
            return;
        }

        this.defer.notify({
            state:Hup.state.FILE_READ_PROGRESS, file_name:this.file.name, progress:this.progress,
            read_result:(event.target.readyState == FileReader.DONE) ? event.target.result : void 0
        });

        this.start = this.end;
        this.end = this.calculateChunkEnd();

        if (!this.paused)
        {
            this.readFile();
        }
    };

    /**
     * On file read error, attempt to create a meaningful error string, and return alongside the error code, reader
     * state and the name of the file on which this error occurred.
     * @param event
     */
    DeferReader.prototype.readError = function(event){
        var err = event.target.error,
                errCode = event.target.error.code,
                errMsg = 'Error attempting to read file "'+this.file.name+'": ';

            switch(errCode)
            {
                case err.NOT_FOUND_ERR:
                    errMsg += "File could not be found.";
                    break;
                case err.NOT_READABLE_ERR:
                    errMsg += "File is not readable.";
                    break;
                case err.ABORT_ERR:
                    errMsg += "File read was aborted.";
                    break;
                default:
                    errMsg += "An unexpected error occurred.";
                    break;
            }
            this.defer.reject({state:Hup.state.FILE_READ_ERROR, file_name:this.file.name, error:errMsg, code:errCode});
    };

    /**
     * Listen for the various events of interest on the file reader, and return notification or resolution
     * to deferred as appropriate.
     */
    DeferReader.prototype.listen = function(){
        this.reader.addEventListener('error', this.readError.bind(this), false);

        this.reader.addEventListener('progress', this.readProgress.bind(this), false);

        this.reader.addEventListener('loadend', this.readComplete.bind(this), false);
    };

    /**
     * Pause this file reader if chunked by ceasing to read the file in after the current chunk is completed.
     * If the defer has already been resolved or rejected, we return, making no attempt to pause a file
     * read that has already finished or been rejected.
     */
    DeferReader.prototype.pause = function(){
        if (this.defer.state() !== 'pending' || !this.options.chunked) return;
        this.paused = true;
        this.defer.notify({
            state:Hup.state.FILE_READ_PAUSE, file_name:this.file.name,
            current_range:{start:this.start, end:this.end, total:this.file.size}});
    };

    /**
     * Resume this file reader from the next chunk if it was previously paused and chunked.
     */
    DeferReader.prototype.resume = function(){
        if (this.options.chunked && this.paused)
        {
            this.paused = false;
            this.defer.notify({
                state:Hup.state.FILE_READ_RESUME, file_name:this.file.name,
                current_range:{start:this.start, end:this.end, total:this.file.size}
            });
            this.readFile();
        }
    };

    /**
     * Entry point for calling the reader/uploader, with the element to be used as input specified.
     * Usage:
     * $('#input').hup({options}).on('events') --OR--
     * $('.inputs').hup({options}).on('events')
     * @param options
     * @returns {Object} jQuery object reference for the given elements.
     */
    $.fn.hup = function(options){
        options = options || {};
        return this.each(function(){
            options.input = this;
            var $this = $(this),
                hup = $this.data('hup');
            if (!hup)
            {
                $this.data('hup', new Hup(options));
            }
            else if (hup instanceof Hup)
            {
                hup.init(options);
            }
        });
    };
})(jQuery);
