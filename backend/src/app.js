const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/api");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta base
app.get("/", (req, res) => {
    res.send("Backend funcionando 🚀");
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});