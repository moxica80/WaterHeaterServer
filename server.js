const SocketServer = require("websocket").server;
var http = require('http');

const port = process.env.PORT || 3000;
var isEPS32Connected = false;
var upDatedJSONDataFromESP32 = {};
const connections = new Map();

function timeStamp() {
    return new Date().toLocaleString('en-GB', {
        timeZone: 'Europe/Athens',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(',', '');
}

var server = http.createServer((request, response) => {    
    response.writeHead(200);
    response.write("<h1>Waterheater WebSocket Server is Online</h1>");
    response.end();
});

server.listen(port, () => {
    console.log(timeStamp() + ' Server started and listening on port ' + port);
});


var wsServer = new SocketServer({
    httpServer: server,
    maxReceivedFrameSize: 1500000,
    maxReceivedMessageSize: 10 * 1024 * 1024,
    autoAcceptConnections: false,
});


wsServer.on("request", (request) => {    
    const socket = request.accept();     

    socket.on("message", (message) => {      
        var userJson = JSON.parse(message.utf8Data);        
        switch (userJson.code) {            
            case 1: //new connection
                connections.set(userJson.user, socket);                                               
                console.log(timeStamp() + " " + userJson.user + " Connected  s:" + connections.size);
                if(userJson.user == "ESP32"){
                    isEPS32Connected = true;                                                 
                }else{                                     
                    let informESP32Connection = {code: 101, isESP32Online: isEPS32Connected};                   
                    socket.sendUTF(JSON.stringify(informESP32Connection));                
                }
                break;
            
            case 10: //ESP32 update data periodically (every 4 secs)                                            
                isEPS32Connected = true;
                upDatedJSONDataFromESP32 = JSON.parse(message.utf8Data);
                upDatedJSONDataFromESP32["isESP32Online"] = isEPS32Connected;
                upDatedJSONDataFromESP32["code"] = 20;                
                if(connections.size > 1){                                              
                    connections.forEach((connection, userName) =>{
                        if(connection != socket){
                            connection.sendUTF(JSON.stringify(upDatedJSONDataFromESP32));
                        }
                    });                                                 
                }
                break;
            case 30://Command from client
                if(isEPS32Connected){
                    connections.get("ESP32").sendUTF(message.utf8Data);                    
                }
                break;
            
            case 31://Command from isTimerActive                
                if(isEPS32Connected){
                    connections.get("ESP32").sendUTF(message.utf8Data);                     
                }
                break;       
        }
    });

    socket.on("close", (resCode, des) => {
        if(connections.size > 0){
            var disconnected_name ="";
            connections.forEach((connection, userName) => {
                if(connection == socket){
                    disconnected_name = userName;
                }
            });

            connections.delete(disconnected_name);                                                                                              
            console.log(timeStamp() + "  " + disconnected_name + " Disconected  s:" + connections.size);           
            if(disconnected_name == "ESP32"){
                isEPS32Connected = false;                
                if(connections.size != 0){
                    let informESP32Connection = {code: 101, isESP32Online: isEPS32Connected};                                              
                    connections.forEach((connection, userName) =>{
                        connection.sendUTF(JSON.stringify(informESP32Connection));
                    });                                                 
                }
            }                                                          
        }
    });
});

wsServer.on("close", () => {
    
});
