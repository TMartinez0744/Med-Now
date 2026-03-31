const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
<<<<<<< Updated upstream
    res.send('MedNow API funcionando con Supabase 🚀');
=======
    res.send('MedNow API funcionando con Prisma 🚀');
>>>>>>> Stashed changes
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});