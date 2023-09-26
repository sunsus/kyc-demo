import {default as express} from 'express';
import {default as multer} from 'multer';
import {default as path} from 'path';
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import {
    generateBlobSASQueryParameters,
    SASProtocol,
    BlobServiceClient,
    newPipeline,
    StorageSharedKeyCredential,
    BlobSASPermissions,
} from '@azure/storage-blob';

var router = express.Router({ mergeParams: true });
const inMemoryStorage = multer.memoryStorage()
const credential = new AzureKeyCredential(config.cognitiveKey);


import getStream from "into-stream";
import { v4 as uuidv4 } from 'uuid';
import {config} from '../config.js'

import {setLogLevel} from '@azure/logger';
import Promiss from "express/lib/application.js";
setLogLevel("info")

// Use StorageSharedKeyCredential with storage account and account key

const getBlobName = (file) => {
    const fileName = Date.now() + "-" + uuidv4() + path.extname(file.originalname)
    return fileName
}

var uploadFilesToBlob = async (directoryPath, containerName1, files) => {
    var promiseList = []

    const sharedKeyCredential = new StorageSharedKeyCredential(config.azureStorageConfig.accountName, config.azureStorageConfig.accountKey)

    const pipeline = newPipeline(sharedKeyCredential, {
        // httpClient: MyHTTPClient, // A customized HTTP client implementing IHttpClient interface
        retryOptions: { maxTries: 4 }, // Retry options
        userAgentOptions: { userAgentPrefix: "Blob Upload" }, // Customized telemetry string
        keepAliveOptions: {
            // Keep alive is enabled by default, disable keep alive by setting false
            enable: false,
        },
    })

    const blobServiceClient = new BlobServiceClient(`https://${config.azureStorageConfig.accountName}.blob.core.windows.net`, sharedKeyCredential)

    // Create a container
    const containerName = config.azureStorageConfig.containerName ? config.azureStorageConfig.containerName : `newcontainer${new Date().getTime()}`
    const containerClient = blobServiceClient.getContainerClient(containerName)
    //   try {
    //      await containerClient.createIfNotExists()

    //   } catch (err) {
    //       console.log("error", err);
    //     console.log(`Creating a container fails, requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`)
    //   }

    files.forEach((file) => {
        const blobName = getBlobName(file)
        const stream = getStream(file.buffer)
        const streamLength = file.buffer.length
        const blobNamewithFolder = directoryPath ? `${directoryPath}/${blobName}` : `${blobName}`
        console.log("blobNamewithFolder", blobNamewithFolder)
        promiseList.push(
            new Promise((resolve, reject) => {
                // Create a blob
                //const blobName = "newblob" + new Date().getTime();
                const blockBlobClient = containerClient.getBlockBlobClient(blobName)

                // Parallel uploading a Readable stream with BlockBlobClient.uploadStream() in Node.js runtime
                // BlockBlobClient.uploadStream() is only available in Node.js
                try {
                    blockBlobClient.uploadStream(stream, 4 * 1024 * 1024, 20, {
                        // abortSignal: AbortController.timeout(30 * 60 * 1000), // Abort uploading with timeout in 30mins
                        onProgress: (ev) => console.log("progress", ev),
                    })

                    let startDateTime = new Date();
                    startDateTime.setMinutes(startDateTime.getMinutes() - 5);

                    let endDateTime = new Date();
                    endDateTime.setMinutes(endDateTime.getMinutes() + 45);

                    const sasOptions = {
                        containerName: config.azureStorageConfig.containerName,
                        blobName: blobName,
                        startsOn: startDateTime,
                        expiresOn: endDateTime,
                        permissions: BlobSASPermissions.parse("r"),
                        protocol: SASProtocol.https,
                    }
                    let blobUrl = `https://${config.azureStorageConfig.accountName}.blob.core.windows.net/${config.azureStorageConfig.containerName}/${blobName}`
                    setTimeout(function () {
                        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString()
                        blobUrl += `?${sasToken}`
                        resolve({
                            filename: blobName,
                            originalname: file.originalname,
                            size: streamLength,
                            path: `${config.azureStorageConfig.containerName}/${blobName}`,
                            url: blobUrl,
                        })
                    }, 2500)
                } catch (err) {
                    console.log("error ", err)
                    console.log(`uploadStream failed, requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`)
                    reject(err)
                }
            }),
        )
    })
    return Promise.all(promiseList).then((values) => {
        return values
    })
}

const imageUpload = async (req, res, next) => {
    try {
        console.log("file length", req.files.length)
        const image = await uploadFilesToBlob(req.body.folderpath, req.body.containerName, req.files) // images is a directory in the Azure container
        // Document Intelligence supports many different types of files.
        console.log("Image uploaded", image);
        return res.json(image);
    } catch (error) {
        next(error)
    }
}

const processDocument = async (req, res, next) => {
    try {
        const result = await Promise.all(req.files.map(async (file) => {
            const client = new DocumentAnalysisClient(
                "https://switzerlandnorth.api.cognitive.microsoft.com/",
                credential
            );
            const poller = await client.beginAnalyzeDocument("prebuilt-idDocument", getStream(file.buffer));
            const {
                documents // extracted documents (instances of one of the model's document types and its field schema)
            } = await poller.pollUntilDone();
            const result =documents.map(doc => {return {
                                                                    documentTyp: doc.fields.DocumentType?.value,
                                                                    documentNumber: doc.fields.DocumentNumber?.value,
                                                                    firstName: doc.fields.FirstName?.value.replace(/[»*·]/g, ''),
                                                                    lastName: doc.fields.LastName?.value.replace(/[»*·]/g, ''),
                                                                    dateOfBirth: doc.fields.DateOfBirth?.value || doc.fields.MachineReadableZone?.properties.DateOfBirth?.value,
                                                                    dateOfExpiration: doc.fields.DateOfExpiration?.value || doc.fields.MachineReadableZone?.properties.DateOfExpiration?.value,
                                                                    dateOfIssue: doc.fields.DateOfIssue?.value || doc.fields.MachineReadableZone?.properties.DateOfIssue?.value
                                                                    }});
            return result.reduce((result, obj) => {
                Object.entries(obj).forEach(([key, value]) => {
                    if (value !== undefined) {
                        result[key] = value;
                    }
                });
                return result;
            }, {});
        }));
        return res.json(result)
    } catch (error) {
        next(error)
    }
}
const multipleFileUpload = multer({ storage: inMemoryStorage }).array("file", 5)
router.route("/upload").post(multipleFileUpload, imageUpload)
router.route("/process").post(multipleFileUpload, processDocument)
export default router;