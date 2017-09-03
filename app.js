var redis = require("redis")

//Creating redis client
client = redis.createClient();
client.on('connect', function(){
  console.log("Connected to redis...");
})

//Function that generates random strings
function makeMessage() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

//Generating messages
function generator() {
  client.setex("generator", "1", "exists");
  var gen = setInterval(function() {
    client.setex("generator", "1", "exists");
    var message = makeMessage();
    client.rpush("messages", message, function(err){
      if (err){
        client.end();
      }
    });
  }, 500);
}

//Processing messages
function processing() {
  //Checking if there is working generator
  var checkGenerator = setInterval( function(){
    client.get("generator", function(err, data){
      if (data===null){
        console.log("THERE IS NO WORKING GENERATOR!!! STARTING TO GENERATE MESSAGES")
        generator();
        clearInterval(proc);
        clearInterval(checkGenerator);
      }
    })
  }, 500)
  var proc = setInterval(function() {
    client.lpop("messages", function(err, data){
      var errorDetect = Math.random();
      if (err){
        console.log(err);
        client.end();
      }
      else if (errorDetect < 0.95){
        console.log("Message processed");
        console.log(data);
      }
      else {
        client.rpush("errors", data, function(err){
          if (err){
            console.log(err);
            client.end();
          }
          else {
            console.log("Error put to REDIS! Value is: "+data);
          }
        })
      }
    });
  }, 1000)
}

//Checking arguments for getErrors
if (process.argv.length===3) {
  var param = process.argv[2];
  if (param==="getErrors") {
    console.log("We got "+ param+" parameter");
    client.lrange("errors","0", "-1", function(err,replies){
      replies.forEach(function(reply, i){
        console.log(i + ' ' + reply);
      })
      client.del('errors');
      client.quit();
    })
  } else {
    console.log("Wrongparam");
    client.quit();
  }
}
//Start generator or processing
else {
  client.get("generator", function(err, data){
    if (data===null){
      console.log("Generator started");
      generator();
      }
    else {
      console.log("Generator is enabled somewhere else. Starting processing");
      processing();
    }
  });
}
