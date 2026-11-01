const SocketServer = require("websocket").server;
var http = require('http');

const port = process.env.PORT || 3000;
const socketList = [];
const connected_names = [];
var serverObject = {};
var serverObject2 = {};
var isEPS32Connected = false;
var upDatedJSONDataFromESP32 = "";
var general_switch = 0;
var isTimerActive = 0;
var remainTimerMinutes = 0;
var device_state = 0
var sp = 40;


var server = http.createServer((request, response) => {    
    response.writeHead(200);
    response.write("<h1>Waterheater WebSocket Server is Online</h1>");
    response.end();
});

server.listen(port, () => {
    console.log((new Date()) + ' ---> Server started and listening on port ' + port);
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
                socketList.push(socket);                                      
                connected_names.push(userJson.user);
                console.log(new Date() + " ---> " + userJson.user + " Connected    sockets: " + socketList.length);
                if(userJson.user == "ESP32"){
                    isEPS32Connected = true;
                    if(socketList.length > 1){                       
                        serverObject = {code: 11, isESP32Online: isEPS32Connected};
                        socketList.forEach((ws) =>{
                            if(ws != socket){
                                ws.sendUTF(JSON.stringify(serverObject));
                            }
                        });                        
                    }                   
                    serverObject2 = {code: 100,
                                    general_switch: general_switch,
                                    set_point: sp,
                                    device_state: device_state,
                                    is_timer_active: isTimerActive,
                                    remain_timer_minutes: remainTimerMinutes,
                                    };
                    
                    socket.sendUTF(JSON.stringify(serverObject2));                                    

                }                                    
                serverObject = {code: 11, isESP32Online: isEPS32Connected};
                socket.sendUTF(JSON.stringify(serverObject));
                break;
            
            case 10: //ESP32 update data periodically (every 4 secs)
                general_switch = userJson.general_switch;
                sp = userJson.set_point;
                device_state = userJson.device_state;
                isTimerActive = userJson.is_timer_active;
                remainTimerMinutes = userJson.remain_timer_minutes;                                
                isEPS32Connected = true;
                upDatedJSONDataFromESP32 = JSON.parse(message.utf8Data);
                upDatedJSONDataFromESP32["isESP32Online"] = isEPS32Connected;
                upDatedJSONDataFromESP32["code"] = 20;
                if(socketList.length > 1){                       
                        serverObject = {code: 11, isESP32Online: isEPS32Connected};
                        socketList.forEach((ws) =>{
                            if(ws != socket){
                                ws.sendUTF(JSON.stringify(upDatedJSONDataFromESP32));                                
                            }
                        });                        
                    }

                break;
            case 30://Command from client
                if(isEPS32Connected){
                    socketList[connected_names.indexOf("ESP32")].sendUTF(message.utf8Data);
                }
                break;
            
            case 31://Command from isTimerActive                
                if(isEPS32Connected){
                    socketList[connected_names.indexOf("ESP32")].sendUTF(message.utf8Data);
                }
                break;
            
            case 101://CHECK ESP32 CONNECTION
                let informESP32Connection = {code: 101, isESP32Online: isEPS32Connected};
                socket.sendUTF(JSON.stringify(informESP32Connection));     
                
        }
    });

    socket.on("close", (resCode, des) => {
        if(socketList.length > 0){        
            var disconnected_name = connected_names[socketList.indexOf(socket)]; 
            if(disconnected_name == "ESP32"){
                isEPS32Connected = false;
                upDatedJSONDataFromESP32["isESP32Online"] = isEPS32Connected; 
                general_switch = 0;    
                device_state = 0;
                isTimerActive = 0;
                remainTimerMinutes = 0;
            }                             
            connected_names.splice(socketList.indexOf(socket), 1);
            socketList.splice(socketList.indexOf(socket), 1);
            console.log(Date() + " ---> " + disconnected_name + " Disconected   sockets: " + socketList.length);                                              
        }       
    });
});

wsServer.on("close", () => {
    //console.log("wsServer.onclose)");
    //clearInterval(monitor);
});