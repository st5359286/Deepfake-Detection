const net = require("net");
const client = new net.Socket();

client.connect(5000, "127.0.0.1", () => {
  console.log("Port 5000 is OPEN - Python ML service is running");
  client.destroy();
});

client.on("error", () => {
  console.log("Port 5000 is CLOSED - Python ML service is NOT running");
});
