# cordova-vapt-plugin

# When added the VAPT cordova plugin will
* Change the allowbackup property on the manifest
* Remove write/read external storage permissions
* Add or change properties to the NSAppSecureTransport tag in the info.plist file

# Installation

### Prerequisites
1. Outsystems Mabs version >= 6.3


### Adding the plugin to your outsystems app

Add a JSON config file to the resource folder in the application with deploy action set to "deploy to target directory" and in the target directory insert "vapt"

the configuration file should look like this :

```
{
  "android":{
    "allowBackup":false,
    "removeReadExternal":true,
    "removeWriteExternal":true
  },
  "ios":[
    {"NSAllowsArbitraryLoads":false},
    {"NSAllowsArbitraryLoadsInWebContent":false},
    {"NSExceptionDomains":
      {"outsystems.com": {
        "NSIncludesSubdomains": true,
        "NSTemporaryExceptionAllowsInsecureHTTPLoads": true,
        "NSTemporaryExceptionMinimumTLSVersion": "TLSv1.1"
        }
      }
    }
  ]
}
```

The ios attribute minimum content is [].


# License

Copyright (c) 2021 Outsystems. All rights reserved.
