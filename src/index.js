import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db("batePapoUol");
} catch (err) {
    console.log(err);
}

app.post("/participants", async (req, res) => {
    const { name } = req.body;

    const uSer = {
        name,
        lastStatus: Date.now()
    }

    const users = await db.collection("participants").find().toArray();
    const isUserExists = users.find((user) => user.name === name);

    if (isUserExists) {
        res.status(409).send({ error: "Usuário já existe" });
        return;
    }

    if (!name) {
        res.status(401).send({error: "Insira um nome"});
        return;
    }

    try {
        await db.collection("participants").insert(uSer);
        res.status(201);
    } catch (err) {
        console.log(err);
        res.status(422);
    }

});

app.get("/participants", async (req, res) => {
    try {
        const users = await db.collection("participants").find().toArray();
        res.send(users);
    } catch (err) {
        console.log(err);
    }
})
app.listen(5000, () => console.log("Server runing in port: 5000"));