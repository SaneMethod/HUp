/**
 * Copyright (c) 2013 Christopher Keefer. All Rights Reserved.
 *
 * jQuery plugin for reading in files or uploading them with the HTML5 file api and xhr2.
 */
(function($){
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
        this.options = $.extend({
            async:true, // Whether to send this file asynchronously
            chunked:true, // Whether to send the file in chunks
            chunk_size:1048576, // Size of each chunk (default 1024*1024)
            input:'', // Input element
            make_dnd:false, // Whether to make the input element handle drag and drop - auto-true if not file input
            read_method:'readAsDataURL', // the read method to use for reading in the file - one of
            // readAsText, readAsBinaryString, readAsDataURL or readAsArrayBuffer
            type:'PUT', // Type of request to use for uploading
            url:false // Url endpoint to send file to - if not specified or false, we read the file and return it
        }, options);

        this.input = $(this.options.input);

        var that = this;
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
    }

    /**
     * Return whether the passed element is an input of type file.
     * @param input Element to check.
     * @returns {boolean}
     */
    Hup.prototype.isFileInput = function(input){
        return (input[0].tagName === 'INPUT' && input[0].getAttribute('type').indexOf('file') !== -1);
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
            this.input.trigger(Hup.state.FILE_LIST_ERROR, {state:Hup.state.FILE_LIST_ERROR,
                error:'No files found in file list; no files were selected.'});
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
            processed = 0;

        for (var i=0, len = files.length; i < len; i++)
        {
            var fprocess = (upload) ? new DeferXhr(this.options, files[i]) :
                new DeferReader(this.options.read_method, files[i]);

            fprocess.progress(function(progress){
                that.input.trigger(progress.state, progress);
            }).done(function(res){
                that.input.trigger(res.state, res);
                processed++;
                if (processed == len)
                    that.input.trigger((upload) ? Hup.state.FILE_UPLOAD_ALL : Hup.state.FILE_READ_ALL ,
                        {state:(upload) ? Hup.state.FILE_UPLOAD_ALL : Hup.state.FILE_READ_ALL, files:len});
            }).fail(function(res)
            {
                that.input.trigger(res.state, res);
            });
        }
    };

    /**
     * Custom events we'll trigger on our input element at the appropriate times.
     * @type {{FILE_LIST_ERROR: string, FILE_LIST_LOADED: string, FILE_READ_ERROR: string,
     * FILE_READ_PROGRESS: string, FILE_READ_FINISHED: string, FILE_READ_ALL: string,
     * FILE_UPLOAD_ERROR: string, FILE_UPLOAD_PROGRESS: string, FILE_UPLOAD_PAUSE: string,
     * FILE_UPLOAD_RESUME: string, FILE_UPLOAD_FINISHED: string, FILE_UPLOAD_ALL: string}}
     */
    Hup.state = {
        FILE_LIST_ERROR:'fileListError',
        FILE_LIST_LOADED:'fileListLoaded',
        FILE_READ_ERROR:'fileReadError',
        FILE_READ_PROGRESS:'fileReadProgress',
        FILE_READ_FINISHED:'fileReadFinished',
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
        var that = this;

        this.defer = $.Deferred();
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

        this.xhr.addEventListener('load', function(){that.complete();}, false);
        this.xhr.upload.addEventListener('progress', function(event){that.uploadProgress(event);}, false);
        this.xhr.upload.addEventListener('error', function(event){that.uploadError(event);}, false);

        this.upload();

        return this.defer.promise();
    }

    /**
     * Carry out the xhr upload, optionally chunked.
     */
    DeferXhr.prototype.upload = function(){
        this.time.start = +new Date();

        this.xhr.open(this.options.type, this.options.url, this.options.async);
        this.xhr.setRequestHeader('Accept', 'application/json');
        this.xhr.setRequestHeader('X-File-Name', this.file.name);
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
    }

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
            console.log('time:', this.time.end-this.time.start, 'speed:', this.time.speed);
            this.defer.notify({state:Hup.state.FILE_UPLOAD_PROGRESS, file_name:this.file.name, speed:this.time.speed,
                progress:this.progress});
        }
    };

    DeferXhr.prototype.uploadError = function(event){
        this.defer.reject({state:Hup.state.FILE_UPLOAD_ERROR, error:event});
    }

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
            response:this.parseResponse(this.xhr.responseText), progress:this.progress});

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
            response:this.parseResponse(this.xhr.responseText)});
    };

    /**
     * Try to parse the response as a JSON, and on failure return the error and the plaintext.
     * @param response
     * @returns {Object}
     */
    DeferXhr.prototype.parseResponse = function(response)
    {
        var response;
        try{
            response = JSON.parse(this.xhr.responseText);
        }catch(e){
            response = {error:e, text:this.xhr.responseText};
        }
        return response;
    }

    /**
     * Pause the upload (works for chunked uploads only).
     */
    DeferXhr.prototype.pause = function(){
        this.paused = true;
        this.defer.notify({state:Hup.state.FILE_UPLOAD_PAUSE, current_range:{start:this.start, end:this.end,
            total:this.file.size}});
    }

    /**
     * Resume the upload (works for chunked uploads only).
     */
    DeferXhr.prototype.resume = function(){
        if (this.paused)
        {
            this.paused = false;
            this.defer.notify({state:Hup.state.FILE_UPLOAD_RESUME, current_range:{start:this.start, end:this.end,
                total:this.file.size}});
            this.upload();
        }
    }

    /**
     * Deferred wrapper for file reader.
     * @param read_method
     * @param file
     * @returns {Object} promise The Deferred promise object
     * @constructor
     */
    function DeferReader(read_method, file){
        this.defer = $.Deferred();
        this.reader = new FileReader();
        this.file = file;
        this.read_method = read_method;

        this.listen();
        this.reader[read_method](file);

        return this.defer.promise();
    }

    /**
     * Listen for the various events of interest on the file reader, and return notification or resolution
     * to deferred as appropriate.
     */
    DeferReader.prototype.listen = function(){
        var that = this;

        this.reader.addEventListener('error', function(event){
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
            that.defer.reject({state:Hup.state.FILE_READ_ERROR, error:errMsg});
        }, false);

        this.reader.addEventListener('progress', function(event){
            if (event.lengthComputable)
            {
                that.defer.notify({state:Hup.state.FILE_READ_PROGRESS, file_name:that.file.name,
                    progress:(event.loaded/event.total)});
            }
        });

        this.reader.addEventListener('loadend', function(event){
            if (event.target.readyState == FileReader.DONE)
            {
                that.defer.resolve({state:Hup.state.FILE_READ_FINISHED,
                    file_name:that.file.name, file_size:that.file.size, file_type:that.file.type,
                    read_method:that.read_method, read_result:event.target.result});
            }
        }, false);
    };

    /**
     * Entry point for calling the reader/uploader, with the element to be used as input specified.
     * Usage:
     * $('#input').hup({options}).on('events') --OR--
     * $('.inputs').hup({options}).on('events')
     * @param options
     * @returns {Hup} Promise deferred from Hup.
     */
    $.fn.hup = function(options){
        var options = (options || {});
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
                console.log('reinit');
                hup.init(options);
            }
        });
    };
})(jQuery);