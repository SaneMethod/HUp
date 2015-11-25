<?php
/**
 * Copyright (c) Christopher Keefer 2013, All Rights Reserved.
 * Example of a simple php script for interacting with our hup jquery plugin for file uploads.
 * Receive the file from our html5 uploader and, if its chunked, append the chunks as we receive them.
 */
class UploadHandler
{
    function __construct(){
        $this->options = array(
            'upload_dir' => dirname($_SERVER['SCRIPT_FILENAME']).'/files/',
        );

        $this->handlePost();
    }

    protected function prepName($name)
    {
        $name = trim(basename(stripslashes($name)), ".\x00..\x20");
        return $name;
    }

    public function sendHead(){
        header('Pragma: no-cache');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Content-Type: application/json');
    }

    public function handlePost(){
        $file = new StdClass();

        $this->sendHead();

        // Get the non-standard header for the file type, if available
        $file->type = isset($_SERVER['HTTP_X_FILE_TYPE']) ? $_SERVER['HTTP_X_FILE_TYPE'] : 'application/octet-stream';
        // Parse the Content-Range header
        // Content-Range: bytes startByte-endByte/totalBytes (#-#/#)
        $content_range = isset($_SERVER['HTTP_CONTENT_RANGE']) ?
            preg_split('/[^0-9]+/', $_SERVER['HTTP_CONTENT_RANGE']) : null;
        $file->size = $content_range ? $content_range[3] : $_SERVER['CONTENT_LENGTH'];
        // Get the non-standard header for the file name, if available, and format appropriately
        $file->name = $this->prepName(isset($_SERVER['HTTP_X_FILE_NAME']) ? urldecode($_SERVER['HTTP_X_FILE_NAME']) : 'tmp');
        $file->path = $this->options['upload_dir'];

        if (!is_dir($file->path))
        {
            mkdir($file->path);
        }
        $file->path .= $file->name;
        $append = $content_range && $content_range[1] != 0 && is_file($file->path);

        $write_sucess = file_put_contents(
            $file->path,
            fopen('php://input', 'r'),
            ($append) ? FILE_APPEND : 0
        );

        $hupReturn = array('file'=>$file, 'success'=>$write_sucess);
        if ($content_range) $hupReturn['content_range'] = $content_range;

        echo json_encode($hupReturn);
        return;
    }
}

$up = new UploadHandler();
