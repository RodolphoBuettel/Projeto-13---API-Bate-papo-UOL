import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const participantSchema = joi.object({
    name: joi.string().min(1).required()
})

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

    const participant = {
        name
    }

    const validation = participantSchema.validate(participant, { abortEarly: false });

    if (validation.error) {
        const erros = validation.error.details.map((detail) => detail.message);
        res.status(422).send(erros);
        return;
    }

    let time = dayjs().locale("pt-br").format("HH:mm:ss");

    const uSer = {
        name,
        lastStatus: Date.now(),
        message:{
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time
        }
    }

    const users = await db.collection("participants").find().toArray();
    const isUserExists = users.find((user) => user.name === name);

    if (isUserExists) {
        res.status(409).send({ error: "Usuário já existe" });
        return;
    }

    try {
        await db.collection("participants").insert(uSer);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(422);
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