

var Client = require('ibmiotf');

function interpret_and_control(mqttCreds, cloudant){
    this.cloudant = cloudant;
    // set up mqtt_handler
    var mqttConfig = {
       "org" : mqttCreds.org,
       "id" : mqttCreds.id,
       "auth-key" : mqttCreds.apiKey,
       "auth-token" : mqttCreds.apiToken
    }
    console.log(mqttConfig);
    this.client = new Client.IotfApplication(mqttConfig);
    this.client.connect();

    this.client.on("error", function (err) {
        console.log("Error : " + err);
    });

};

interpret_and_control.prototype.connectionStatus = function(){
    return this.client.getOrganizationDetails();
};

interpret_and_control.prototype.imageKeywords = function(keywords, time, location){
    var identified = false;


    for (var keyword in keywords){

        switch (keyword) {
            case "Fire":
                this.sendCommand("pi", "drone", "movement", "json", JSON.stringify({direction:"UP"}));
                var color = {d: {r:155, g:255, b:0, alpha:120}};
                this.sendCommand("Android", "phone", "color", "json", JSON.stringify(color));
                this.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Fire"}}));
                this.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Fire"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Person":
                this.sendCommand("pi", "drone", "movement", "json", JSON.stringify({direction:"STOP"}));
                this.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Person"}}));
                this.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Person"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Building":
                this.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Person"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Explosion":
                this.sendCommand("pi", "drone", "movement", "json", "STOP");
                this.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Explosion"}}));
                this.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Explosion"}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case "Smoke":
                this.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d: {text:"Smoke"}}));
                this.sendCommand("Android", "phone", "log", "json", JSON.stringify({d: {text:"Smoke"}}));
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


    // Find keywords? Or analyse sentence somehow?
    if(transcript.find()){
        this.sendCommand("Android", "phone", "speech", "json", JSON.stringify());
    }
    if(!transcript.equals("")){
        this.sendCommand("pi", "drone", "movement", "json", "STOP");
        this.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Person"}}));
        this.sendCommand("Android", "phone", "log", "json", JSON.stringify({d:{text:"Person"}}));
        this.logEvent("Person:" + transcript, time, location);
        //somehow to tone Analysis?
    }

}

interpret_and_control.prototype.sendCommand = function(deviceType, deviceId, commandType, format, data){
    var client = this.client;
    client.on("connect", function(){
        client.publishDeviceCommand(deviceType, deviceId, commandType, format, data);
    });
}

interpret_and_control.prototype.sendEvent = function(deviceType, deviceId, commandType, format, data){
    var client = this.client;
    client.on("connect", function(){
        client.publishDeviceEvent(deviceType, deviceId, commandType, format, data);
    });
}

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
