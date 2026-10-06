const cloudinary = require('cloudinary').v2

// `quality` is a Cloudinary quality setting (1-100, or "auto"), not a pixel
// size. Callers that passed a pixel value here were having their uploads
// rejected.
exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
    if (!file || !file.tempFilePath) {
        throw new Error("No file was provided for upload")
    }

    const options = { folder }
    if (height) {
        options.height = height
        // A height with no crop mode is ignored by Cloudinary, so the image
        // came back at its original size.
        options.crop = "scale"
    }
    if (quality) {
        options.quality = quality
    }
    options.resource_type = "auto"

    return await cloudinary.uploader.upload(file.tempFilePath, options)
}
