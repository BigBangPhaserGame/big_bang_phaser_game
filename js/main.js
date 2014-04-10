require.config({
    baseUrl: '/Big_Bang_Phaser_Project',
        // set baseURL to 'js' when bbclient.min.js is in the folder entitled 'js' along with main.js, phaser.min.js, and require.js
    paths: {
        "BrowserBigBangClient": "bbclient.min",
        "BigBangClient": "bbclient.min"
    }
});

require(['BigBangClient', 'BrowserBigBangClient'], function (bb, bbw) {

    var client = new bbw.BrowserBigBangClient();

    client.login("tbp.app.bigbang.io", 8888, "test", "test", "98a9b82f-e847-4965-b1b2-e00c5135796d", function (result) {
        if (result.authenticated) {
            client.connect(result.hosts['websocket'], result.clientKey, function (connectResult) {
                if (connectResult.success) {
                    client.subscribe("channel1", function (err, c) {
                        if (!err) {
                            beginGame(client, c);
                        }
                        else {
                            console.log("Shit, what happened? " + err);
                        }
                    });
                } else {
                    console.log("EPIC FAIL.");
                }
            });
        } else {
            console.log("Login failed. " + result.message);
        }
    });

    function beginGame(client, channel) {
        var game = new Phaser.Game(500, 500, Phaser.AUTO, null, {
            preload: preload,
            create: create,
            update: update
        });

        //keep track of when players join (open the browser window) and leave (close the browser window):
        //function onSubscribers(joinFunction(joined);, leaveFunction(left);){}
        //here, joined and left are both id's (each is a GUID), of a player joining and leaving, respectively
        
        channel.onSubscribers(function (joined) {
            /*console.log(joined +" joined");
            spawn(joined);*/
        },function(left){
            //console.log(left +" left");
            kill(left);
        });

        var myPlayer, //my player
            label,
            style = {
                font: "11px Arial",
                fill: "#ffffff"
            } //styling players labels a bit

        //var playerName;

        var allPlayers = new Array();

        function preload() {
            game.load.spritesheet('char', 'images/char01.png', 32, 48) // define where avatar can be found. Because avatars are in a spritesheet with completely identical rectangular dimensions, just need to define 32 x 48 box to equal 1 avatar.
        }

        function create() {
            game.stage.backgroundColor = '#9966FF';
            var playerName = prompt("What is your name?");
                if (playerName == "") {
                    playerName = prompt("Please enter a name.");
                }
            var me = {
                id: client.clientId(),
                x: Math.floor(Math.random()*500),
                y: Math.floor(Math.random()*500),
                playerName: playerName
                // x: Math.floor(Math.random()*window.innerWidth),
                // y: Math.floor(Math.random()*window.innerHeight),
            };
            spawn(me); //add the sprite for the player in my window, which has the id of client.clientId(). Note, it won't have the 'joined' id
            //console.log("me.playerName = " + me.playerName);
            channel.handler = function (message) {
                var m = message.payload.getBytesAsJSON();
                //console.log("m.id = " + m.id + " and m.playerName = " + m.playerName);
                //message.payload.getBytesAsJSON appears as, "Object {id: "...long GUID...", x: #, y: #}"
                //so you can call m.id, m.x, and m.y
                //console.log("Message: m.id = " + m.id + ", m.x = " + m.x + ", and m.y = " + m.y); //display messages being sent from each channel
                uPosition(m);
            }
        }  

        function update() {
            //game.physics.collide(myPlayer, player); //prevent my player from overlapping other players, but allow to push each other?

            if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)) {
                myPlayer.animations.play('left');
                myPlayer.x -= 3;
                //move my player's name label around with my player in my own window:
                myPlayer.label.x = myPlayer.x;
                myPlayer.label.y = myPlayer.y - 10; //label above player
                sendPosition(myPlayer.x, myPlayer.y, myPlayer.playerName); //sendPosition is a function defined below.
            } else if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)) {
                myPlayer.animations.play('right');
                myPlayer.x += 3;
                myPlayer.label.x = myPlayer.x;
                myPlayer.label.y = myPlayer.y - 10; //label above player
                sendPosition(myPlayer.x, myPlayer.y, myPlayer.playerName);
            } else if (game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
                myPlayer.animations.play('up');
                myPlayer.y -= 3;
                myPlayer.label.x = myPlayer.x;
                myPlayer.label.y = myPlayer.y - 10; //label above player
                sendPosition(myPlayer.x, myPlayer.y, myPlayer.playerName);
            } else if (game.input.keyboard.isDown(Phaser.Keyboard.DOWN)) {
                myPlayer.animations.play('down');
                myPlayer.y += 3;
                myPlayer.label.x = myPlayer.x;
                myPlayer.label.y = myPlayer.y - 10; //label above player
                sendPosition(myPlayer.x, myPlayer.y, myPlayer.playerName);
            } 

        }

        function sendPosition(x, y, posName) {
            var pos = {}; //create pos object to hold my players's id and position's x and y coordinate
            pos.id = client.clientId();
            pos.x = x;
            pos.y = y;
            pos.playerName = posName;

            channel.publish(pos); // pos will become the (message) parameter in channel.handler once it is received by another computer.
            //console.log(pos);
        }
        
        function spawn(mSpawn) {
            //console.log("spawn!");
            //distinguish between my player and other people's players:
            //console.log("Within spawn(m) function, " + mSpawn.id.substring(0,8) + " has mSpawn.playerName = " + mSpawn.playerName);
            var label = mSpawn.playerName; // label is what we defined earlier with prompt
            player = game.add.sprite(mSpawn.x, mSpawn.y, 'char'); // Attaches x, y, as properties to "player" object
            player.id = mSpawn.id;
            player.playerName = mSpawn.playerName;
            player.animations.add('down', [0, 1, 2], 10);
            player.animations.add('left', [12, 13, 14], 10);
            player.animations.add('right', [24, 25, 26], 10);
            player.animations.add('up', [36, 37, 38], 10);
            player.body.collideWorldBounds = true; // player object now has properties of: x, y, id, playerName, animations, body
            player.label = game.add.text(player.x, player.y - 10, label, style);
            //player.x = mSpawn.x; Redundant because attached earlier in game.add.sprite
            //player.y = mSpawn.y;
            //console.log("Sent the initial position info!");
            //console.log(player.id + " is at coordinate " + "(" + player.x + ", " + player.y + ")");
            allPlayers.push(player); //add the newly spawned player to the allPlayers array
            //console.log(player);
            if (mSpawn.id === client.clientId()) {
                //now that my player has all the player object properties loaded, let's change his name to myPlayer to distinguish him in future commands
                console.log ("This is me who just spawned. My name is " + mSpawn.playerName + " and my id is " + client.clientId());
                myPlayer = player;
            } else {
                console.log("A player of the name " + mSpawn.playerName + " and id of " + mSpawn.id + " just spawned a char sprite with a label");
            }
            //console.log("length of allPlayers = " + allPlayers.length);
            return; //player; // Why do we return a value if, in create function when called, there's no declared variable that this returned valie is equal to?
        }

        function uPosition(mPosition) {
            //do the following only for other players who are sending messages
            var index = 0;
            var i = 0;
            if (mPosition.id != client.clientId()) {
                //console.log("message id does not equal client id");   
                do {
                    if(allPlayers[i].id === mPosition.id) {
                        //console.log("Found a match in the allPlayers array");
                        index = i;
                        break; 
                    } else {
                        //console.log("Have not found a match in the allPlayers array yet, keep looping");
                        i = i + 1;
                        index = i;
                    }
                    if(index >= allPlayers.length) { //the allPlayers array will be shorter in a user's browser window where the message-sending player has not yet been spawned
                        //if the player sending the message isn't in the allPlayer array, it needs to be spawned in my browser window
                        //console.log("not spawned yet");
                        //console.log("Need to first spawn this guy: " + mPosition.id.substring(0,8) + " " + mPosition.playerName);
                        spawn(mPosition);
                        break;
                    }
                } while (i < allPlayers.length);

                if (index != 0) {
                    if (allPlayers[index].x > mPosition.x) { // Is the message for the player  allplayers[index] on the screen farther left than what our screen says, then do the "left animation" defined in update and create function
                        allPlayers[index].animations.play('left');                
                    } else if (allPlayers[index].x < mPosition.x) {
                        allPlayers[index].animations.play('right');             
                    } else if (allPlayers[index].y > mPosition.y) {
                        allPlayers[index].animations.play('up');
                    } else {
                        allPlayers[index].animations.play('down');
                    }
            
                    allPlayers[index].x = allPlayers[index].label.x = mPosition.x; // set players position and label equal to what the message says for the x and y coordinates.
                    allPlayers[index].y = mPosition.y;
                    allPlayers[index].label.y = mPosition.y - 10; //label above player
                } else {
                    return;
                }
                
            } else {
                //console.log("Message id equals client id");
                //don't do anything when the uPosition function is being called for my player, as it's already updated in my browser window
                return;
            }
        }

        function kill(left) {
            //console.log("kill!");
            var kIndex = 0;
            var k = 0;
            do {
                if(allPlayers[k].id === left) {
                    //console.log("Found a match in the allPlayers array");
                    kIndex = k;
                    break; 
                } else {
                        //console.log("Have not found a match in the allPlayers array yet, keep looping");
                        k = k + 1;
                        kIndex = k;
                }
                if(kIndex >= allPlayers.length) {
                        break;
                }
            } while (k < allPlayers.length);

            if (kIndex != 0) {      
            allPlayers[kIndex].destroy();
            allPlayers[kIndex].label.destroy();
            console.log("Player " + left + " just left the game. Bye bye!");
            return;
            
            }      
        }
    }
});

