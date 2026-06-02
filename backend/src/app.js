const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/api");
const chatRoomRoutes = require("./routes/chatRoomRoutes");
const derivacionesRoutes = require("./routes/derivacionesRoutes");

const app = express();

// Cabeceras HTTP de seguridad robustas
app.use(helmet());

// Configuración segura de CORS
const allowedOrigins = [
    'http://localhost:5173', // Frontend en desarrollo de Vite
    'http://127.0.0.1:5173',
    'http://localhost:5174', // Puerto alternativo de Vite
    'http://127.0.0.1:5174',
];

const corsOptions = {
    origin: function (origin, callback) {
        // En desarrollo local, se permiten solicitudes sin origen (ej: Postman, curl, tests locales)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS.'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Ruta base
app.get("/", (req, res) => {
    res.send("Backend funcionando y protegido 🛡️");
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoomRoutes);
app.use("/api/derivaciones", derivacionesRoutes);
app.use("/api", apiRoutes);

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    
    // Iniciar el emulador de tareas cron en segundo plano para recordatorios de turnos
    const { sendReminderCron } = require("./cron/turnoReminderCron");
    setInterval(sendReminderCron, 60 * 60 * 1000); // Cada 1 hora
    setTimeout(sendReminderCron, 10000); // Inicialización de cortesía a los 10 segundos
});