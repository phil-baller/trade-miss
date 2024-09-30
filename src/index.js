import express, { json } from "express";
import MetaApi from "metaapi.cloud-sdk/esm-node";
import dotenv from "dotenv";
import { Server } from "socket.io";
dotenv.config();
const app = express();

app.use(express.json());
import { createClient } from "redis";

const client = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: "redis-12963.c74.us-east-1-4.ec2.redns.redis-cloud.com",
    port: 12963,
  },
});

await client.connect();

const PORT = process.env.PORT || 3000;
const io = new Server(3001);


const api = new MetaApi(process.env.TOKEN);
const account = await api.metatraderAccountApi.getAccount(
  process.env.MT_ID
);
const connection = account.getStreamingConnection();
await connection.connect();

await connection.waitSynchronized();

const terminalState = connection.terminalState;

connection.subscribeToMarketData("XAUUSD");

io.on("connection", (socket) => {
  console.log("A user is connected");
  client.get("alert", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      socket.emit("alert", JSON.parse(data));
    }
  })
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post('/addAlert', (req, res) => {
    const {pair, price} = req.body;

    let redisData = {
        pair: pair,
        price: price
    }
    client.set('alert', JSON.stringify(redisData));
    connection.subscribeToMarketData(pair);
    res.send("Trade alert added successfully")
})

app.get("/", (req, res) => {
  res.send(terminalState.price("EURUSD"));
  res.send("Hello World!");
});



// while (true) {
//     const alertData = {
//       pair: terminalState.price("XAUUSD").symbol,
//       price: terminalState.price("XAUUSD").ask,
//     };
//   console.log(`Price of xauusd at ${new Date()}`,alertData);
//   await new Promise((resolve) => setTimeout(resolve, 50));
// }


