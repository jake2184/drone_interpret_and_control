

var Client = require('ibmiotf');
var mode_normal = require('./modes/normal');
var mode_interact = require('./modes/interact');

var Fire = "Fire";
var Person = "Person";
var Building = "Building";
var Explosion = "Explosion";
var Normal = "Normal";
var Smoke = "Smoke";




function interpret_and_control(MQTT, cloudant){
    this.cloudant = cloudant;
    this.MQTT = MQTT;
    // set up mqtt_handler
    // var mqttConfig = {
    //    "org" : mqttCreds.org,
    //    "id" : mqttCreds.id,
    //    "auth-key" : mqttCreds.apiKey,
    //    "auth-token" : mqttCreds.apiToken
    // }
    // this.client = new Client.IotfApplication(mqttConfig);
    // this.client.connect();
    // this.client.on("error", function (err) {
    //     console.error("Error : " + err);
    // });

    this.currentMode = new mode_normal();
    this.modeFactors = [];
    this.modeFactors.push({"imageLabels": []  });
};

interpret_and_control.prototype.connectionStatus = function(){
    return this.client.getOrganizationDetails();
};

interpret_and_control.prototype.getMode = function(){
    return this.currentMode;
}

interpret_and_control.prototype.setMode = function(modeType){
    switch(modeType){
        case Normal:
            this.currentMode = new mode_normal();
            break;
        case Fire:
            this.currentMode = new mode_fire();
            break;
        case Person:
            this.currentMode = new mode_interact();
            break;
        case Explosion:
            this.currentMode = new mode_avoidance();
        default:
            console.error("No known mode: " + modeType);
    }
}

interpret_and_control.prototype.determineMode = function(){
    // Use this.modeFactors to evaluate mode regularly. As callback?

    // Image Determination
    var labels = this.modeFactors["imageLabels"];
    // NULL values are handled by comparison - returns false
    if(labels[Fire] >= 0.8){
        this.setMode(Fire);
    } else if (labels[Person] >= 0.8){
        this.setMode(Person);
    } else if (labels[Fire] >= 0.6 && labels[Smoke] >= 0.6){
        this.setMode(Fire);
    }

    // Combination Determination
}

// This filtering is not strictly needed.
interpret_and_control.prototype.imageKeywordsDetermineMode = function(keywords){
    this.modeFactors["imageLabels"] = [];

    // Select appropriate keywords
    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
          break;
        }
        var keyword = keywords[i].name;
        if ( keyword == Fire ||  keyword == Person ||  keyword == Building ||  keyword == Explosion
                    ||  keyword == "Smoke") {
            this.modeFactors["imageLabels"][keyword] = keywords[i].score;
        }
    }
    this.determineMode();
}


interpret_and_control.prototype.imageKeywords = function(keywords, time, location){
    var identified = false;

    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
          return identified;
        }
        var keyword = keywords[i].name;
        switch (keyword) {
            case "Fire":
                this.MQTT.sendCommand("pi", "dronepi", "movement", "json", "UP");
                this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Fire"}}));
                this.MQTT.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Fire"}}));
                //this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Person":
                this.MQTT.sendCommand("pi", "dronepi", "movement", "json", "STOP");
                this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Person"}}));
                this.MQTT.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Person"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Building":
                this.MQTT.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Building"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Explosion":
                this.MQTT.sendCommand("pi", "dronepi", "movement", "json", "STOP");
                this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Explosion"}}));
                this.MQTT.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Explosion"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Smoke":
                this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d: {text:"Smoke"}}));
                this.MQTT.sendCommand("Android", "phone", "log", "json", JSON.stringify({d: {text:"Smoke"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            default:
                identified = false;
        }
    }
    return identified;
}

interpret_and_control.prototype.speechTranscript = function(transcript){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?
    if(transcript.find()){
        this.MQTT.sendCommand("Android", "phone", "speech", "json", JSON.stringify());
    }
    if(!transcript.equals("")){
        this.MQTT.sendCommand("pi", "dronepi", "movement", "json", "STOP");
        this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Person"}}));
        this.MQTT.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Person"}}));
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
}

// Publish a command
// interpret_and_control.prototype.sendCommand = function(deviceType, deviceId, commandType, format, data){
//     var client = this.client;
//     client.on("connect", function(){
//         client.publishDeviceCommand(deviceType, deviceId, commandType, format, data);
//     });
// }
//
// // Publish an event - should change logging to events not commands
// interpret_and_control.prototype.sendEvent = function(deviceType, deviceId, commandType, format, data){
//     var client = this.client;
//     client.on("connect", function(){
//         client.publishDeviceEvent(deviceType, deviceId, commandType, format, data);
//     });
// }

// Log event with database
interpret_and_control.prototype.logEvent = function(type, time, location){
    var eventLog = this.cloudant.db.use('eventlog');
    var docID = time;
    var data = {
        eventType : type,
        eventLocation: location,
    }
    eventLog.insert(data, docID, function(err, body){
        if(err){
            console.log("Error inserting event \"" + type + "\" from time: " + time);
        }
    });
}


module.exports = interpret_and_control;
