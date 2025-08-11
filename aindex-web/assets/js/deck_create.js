import Dropzone from "dropzone";

let deckDropzone = new Dropzone("#deck-dropzone", {
    paramName: "file",
    uploadMultiple: false,
    maxFiles: 1,
});

// Allow only one file upload
deckDropzone.on('maxfilesexceeded', function (file) {
     this.removeFile(file);
});

// Redirect after successful upload
deckDropzone.on('success', file => {
    const redirectURL = file.xhr.responseURL;

    if (redirectURL) {
        window.location.href = redirectURL;
    } else {
        window.location.href = '/deals/fresh';
    }
});
