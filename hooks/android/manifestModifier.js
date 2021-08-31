
var fs = require('fs');
var path = require('path');
var {isCordovaAbove} = require("../utils");

var allowBackup;
var debuggable;

function replacerAllowBackup(match, p1, p2, p3, offset, string){
  p2 = p2.replace((!allowBackup).toString(),allowBackup.toString());
  p2 += ' ' + 'tools:replace="android:allowBackup"';
  return [p1,p2,p3].join("");
}
function adderAllowBackup(match, p1, p2, offset, string){
  if(p2.includes("allowBackup")){
    var regexAllowBackup = /(<\?xml [\s|\S]*<application.*)(android:allowBackup=".*")(.*>[\s|\S]*<\/manifest>)/gm;
    var fullmanifest =  [p1,p2].join("");
    return fullmanifest.replace(regexAllowBackup,replacerAllowBackup);
  }else{
    return [p1,' ' + 'tools:replace="android:allowBackup" android:allowBackup="'+allowBackup.toString()+'" ',p2].join("");
  }
}

function replacerDebuggable(match, p1, p2, p3, offset, string){
  p2 = p2.replace((!debuggable).toString(),"false");
  //p2 += ' ' + 'tools:replace="android:debuggable"';
  return [p1,p2,p3].join("");
}
function adderDebuggable(match, p1, p2, offset, string){
  if(p2.includes("debuggable")){
    var regexDebuggable = /(<\?xml [\s|\S]*<application.*)(android:debuggable=".*")(.*>[\s|\S]*<\/manifest>)/gm;
    var fullmanifest =  [p1,p2].join("");
    return fullmanifest.replace(regexDebuggable,replacerDebuggable);
  }else{
    return [p1,' ' + ' android:debuggable=false ',p2].join("");
  }
}


function replacerWriteExternalStorage(match, p1, p2, p3, offset, string){
  return [p1,p3].join("");
}

module.exports = function (context) {

    console.log("Start changing Manifest!");
    var deferral;
    var cordovaAbove8 = isCordovaAbove(context, 8);
    if (cordovaAbove8) {
      deferral = require('q').defer();
    } else {
      deferral = context.requireCordovaModule("q").defer();
    }

    var configPath = path.join(context.opts.projectRoot,"www", "vapt", "config.json");

    try {
      jsonconfig = fs.readFileSync(configPath, "utf8");
    }
    catch (e) {
      console.warn("Error in configuration File : " + e.message);
    }

    jsonObj = JSON.parse(jsonconfig)
    jsonObj = jsonObj.android;

    var projectRoot = context.opts.cordova.project ? context.opts.cordova.project.root : context.opts.projectRoot;
    var manifestPath = path.join(projectRoot,"platforms","android","app","src","main","AndroidManifest.xml");
    var manifest = fs.readFileSync(manifestPath, "utf8");

    allowBackup = jsonObj.allowBackup;
    debuggable = jsonObj.debuggable;
  
    var regexApplication = /(<\?xml [\s|\S]*<application)(.*>[\s|\S]*<\/manifest>)/gm;
    manifest = manifest.replace(regexApplication,adderAllowBackup);
    

    //add tools namespace to override any other values for allowBackup
    const toolsAttribute = "xmlns:tools=\"http://schemas.android.com/tools\"";
    const manifestOpen = "<manifest";

    if(manifest.indexOf(toolsAttribute) == -1) {
      manifest = manifest.replace(manifestOpen, manifestOpen + " " + toolsAttribute + " ");
    }
    //end add tools namespace
  
    manifest = manifest.replace(regexApplication,adderDebuggable);
    //if(manifest.indexOf(toolsAttribute) == -1) {
      //manifest = manifest.replace(manifestOpen, manifestOpen + " " + toolsAttribute + " ");
   // }  
  
  
    if(jsonObj.removeReadExternal){
      var regexWriteExternalStorage = /(<\?xml [\s|\S]*)(<uses-permission android:name="android\.permission\.READ_EXTERNAL_STORAGE" \/>)([\s|\S]*<\/manifest>)/gm;
      manifest = manifest.replace(regexWriteExternalStorage,replacerWriteExternalStorage);
    }

    if(jsonObj.removeWriteExternal){
      var regexWriteExternalStorage = /(<\?xml [\s|\S]*)(<uses-permission android:name="android\.permission\.WRITE_EXTERNAL_STORAGE" \/>)([\s|\S]*<\/manifest>)/gm;
      manifest = manifest.replace(regexWriteExternalStorage,replacerWriteExternalStorage);
    }
 
    fs.writeFileSync(manifestPath, manifest);
    console.log("Finished changing Manifest!");
    deferral.resolve();

    return deferral.promise;
}
