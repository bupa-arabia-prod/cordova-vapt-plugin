var plist;
const path = require("path");
const fs = require("fs");
const {isCordovaAbove} = require("../utils");

const  NSAppTransportSecurity = "NSAppTransportSecurity";
const DIR_SEARCH_EXCEPTION = ["build", "cordova", "CordovaLib"];
const FILE_PACKAGE = "package.json";
const FOLDER_PLATFORMS = "platforms";

function addOrReplaceNSAppTransportSecurityConfig(file,key,value,toReplace) {
    var pListContent = fs.readFileSync(file, "utf8");
    let pListObj = plist.parse(pListContent);
    var existsATS = false;
    var existskey = false;
    for (let property in pListObj) {
        if (property.localeCompare(NSAppTransportSecurity) == 0) {
            for (let ATSKeys in pListObj[property]){
                if (ATSKeys.localeCompare(key) == 0) {
                    if(toReplace){
                        pListObj[property][key] = value;
                    }else{
                        let json = JSON.parse(value);
                        pListObj[property][key] = Object.assign(pListObj[NSAppTransportSecurity], json);
                    }
                    existskey = true;
                }
            }
            existsATS = true;
        }
    }
    if(existsATS && !existskey){
        if(toReplace){
            pListObj[NSAppTransportSecurity][key] = value;
        }else{
            let json = JSON.parse(value);
            pListObj[NSAppTransportSecurity][key] = json;
        }
    }else if(!existsATS){
        let jsonString = '{"'+key+'":'+value+'}'
        let json = JSON.parse(jsonString);
        pListObj[NSAppTransportSecurity] = Object.assign({}, json);
    }
    fs.writeFileSync(file, plist.build(pListObj));
}


function compareFileNames(file, filePattern) {
    let fileName = path.basename(file);
    return fileName.indexOf(filePattern) > -1;
}

function searchForPListFile(projectRoot) {
    let foundPListFiles;
    try {
        let packageApplicationContent = fs.readFileSync(path.join(projectRoot, FILE_PACKAGE));
        let packageApplicationJSON = JSON.parse(packageApplicationContent);
        foundPListFiles = searchFilePatternInDirectory(path.join(projectRoot, FOLDER_PLATFORMS, "ios"),[], packageApplicationJSON.name + "-Info.plist", DIR_SEARCH_EXCEPTION,true, compareFileNames);
    }
    catch (e) {
        console.warn("Didnt find package.json and couldn't read name of the application. Will search for other plist files.");
    }
    if (!foundPListFiles || foundPListFiles.length == 0) {
        try {
            foundPListFiles = searchFilePatternInDirectory(path.join(projectRoot, FOLDER_PLATFORMS, "ios"),[], "-Info.plist", DIR_SEARCH_EXCEPTION,true,compareFileNames);
        }
        catch (e) {
        }
    }
    if (foundPListFiles === undefined || foundPListFiles.length == 0) {
        throw new Error("Can't find .plist file in iOS Folder! Try to use plist= custom argument. See documentation for help!");
    }
    else if (foundPListFiles.length > 1) {
        console.warn("Found several -Info.plist files, will take the first one: " + path.resolve(foundPListFiles[0]));
    }
    return foundPListFiles[0];
}
function searchFilePatternInDirectory(searchPath, foundFiles, pattern, filteredDirectories, recursive, fileCompare) {
    var files = fs.readdirSync(searchPath)
    let dirArr = [];
    for (let i = 0; i < files.length; i++) {
        let dirInfo = isDirectory(path.join(searchPath, files[i]));
        if (dirInfo) {
            if (dirInfo.isDirectory) {
                if (!isDirectoryFiltered(dirInfo.path, filteredDirectories) && recursive) {
                    dirArr.push(dirInfo.path);
                }
            }
            else {
                if (fileCompare(dirInfo.path, pattern)) {
                    foundFiles.push(dirInfo.path);
                }
            }
        }
    }
    for (let ii = 0; ii < dirArr.length; ii++) {
        foundFiles = searchFilePatternInDirectory(dirArr[ii], foundFiles, pattern, filteredDirectories, recursive, fileCompare);
    }
    return foundFiles;
}
function isDirectory(checkPath) {
    try {
        let stats = fs.statSync(checkPath);
        return {
            isDirectory: stats.isDirectory(),
            path: checkPath
        };
    }
    catch (e) {
        console.warn("Directory or File could not be read: " + path.resolve(checkPath));
        return undefined;
    }
}
function isDirectoryFiltered(dirPath, filteredDirectories) {
    let dirName = path.basename(dirPath);
    for (let i = 0; i < filteredDirectories.length; i++) {
        if (dirName == filteredDirectories[i]) {
            return true;
        }
    }
    return false;
}
module.exports = function (context) {
    var deferral;
    if(isCordovaAbove(context, 8)){
       plist = require("plist");
       deferral = require('q').defer();
    }else{
       plist = context.requireCordovaModule("plist");
       deferral = context.requireCordovaModule("q").defer();
    }
    var jsonconfig;
    var configPath = path.join(context.opts.projectRoot,"www", "vapt", "config.json");

    console.log("Started PList change!")
    try {
        jsonconfig = fs.readFileSync(configPath, "utf8");
    }
    catch (e) {
        console.warn("Error in configuration File : " + e.message);
    }
    let pathToPList = searchForPListFile(context.opts.projectRoot);
    jsonObj = JSON.parse(jsonconfig)
    jsonObj = jsonObj.ios;
    for(let j = 0;j<jsonObj.length;j++){
        for(key in jsonObj[j]){
            var value = jsonObj[j][key];
            addOrReplaceNSAppTransportSecurityConfig(pathToPList,key,JSON.stringify(value),!(typeof value === 'object' && value !== null));
        }
    }
    
    console.log("Ended PList change!");

    deferral.resolve();

    return deferral.promise;
    //'{"outsystems.com":{"NSIncludesSubdomains":true,"NSTemporaryExceptionAllowsInsecureHTTPLoads":true,"NSTemporaryExceptionMinimumTLSVersion":"TLSv1.1"}}'
}
