import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const participantSchema = joi.object({
    name: joi.string().min(1).required()
})

const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required()
})

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let time = dayjs().locale("pt-br").format("HH:mm:ss");

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

    const uSer = {
        name,
        lastStatus: Date.now()
    };

    const login = {
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time
    }

    const users = await db.collection("participants").find().toArray();
    const isUserExists = users.find((user) => user.name === name);

    if (isUserExists) {
        res.status(409).send({ error: "Usuário já existe" });
        return;
    }

    try {
        await db.collection("participants").insertOne(uSer);
        await db.collection("messages").insertOne(login);
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
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const message = {
        to,
        text,
        type
    }

    const validation = messageSchema.validate(message, { abortEarly: false });

    if (validation.error) {
        const erros = validation.error.details.map((detail) => detail.message);
        res.status(422).send(erros);
        return;
    }

    const sender = await db.collection("participants").find().toArray();
    const isUserExists = sender.find((u) => u.name === user);

    if (!isUserExists) {
        res.status(409).send({ error: "Usuário não existe" });
        return;
    }

    const messageVerificated = {
        to,
        from: user,
        text,
        type,
        time
    }

    try {
        await db.collection("messages").insertOne(messageVerificated);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(422);
    }

});

app.get("/messages", async (req, res) => {

    const limit = req.query.limit;
    const user = req.headers.user;

    try {
        const mes = await db.collection("messages").find().toArray();
        let lastMessages = mes.filter(m => m.to === user ||
            m.from === user || m.to === 'Todos');

        if (limit) {
            lastMessages = lastMessages.slice(0, limit);
        }
        res.send(lastMessages);
    } catch (err) {
        console.log(err);
    }
});

app.post("/status", async (req, res) => {
    const { user } = req.headers;

    const checkStatus = await db.collection("participants").find().toArray();
    const isUserExists = checkStatus.find((u) => u.name === user);

    if (!isUserExists) {
        res.sendStatus(404);
        return;
    }

    try {
        await db.collection("participants");
        db.collection("participants").updateOne({ name: user },
            { $set: { lastStatus: Date.now() } });
        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        res.sendStatus(422);
    }

});

async function removeInactive() {
    const participants = await db.collection("participants").find().toArray()

    participants.forEach(async (user) => {
        let day = new Date();
        let period = day.toLocaleTimeString();

        if (((Date.now() / 1000)) - (user.lastStatus / 1000) > 10) {
            await db.collection("participants").deleteOne({ name: user.name })
            await db.collection("messages").insertOne({
                from: user.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: period
            });
        };
    });
};

setInterval(removeInactive, 15000);

app.listen(process.env.PORT, () => console.log(`Server runing in port: ${process.env.PORT}`));