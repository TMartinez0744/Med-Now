const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend funcionando");
});

app.use("/api/auth", authRoutes);

app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});