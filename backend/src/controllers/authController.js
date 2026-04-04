let usuarios = [];

const register = (req, res) => {
    const { dni, password } = req.body;

    console.log("Datos recibidos en register:", dni, password);

    if (!dni || !password) {
        return res.status(400).json({
            message: "DNI y password son obligatorios",
        });
    }

    if (!/^\d{7,8}$/.test(dni)) {
        return res.status(400).json({
            message: "DNI inválido",
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "La contraseña debe tener al menos 6 caracteres",
        });
    }

    const usuarioExistente = usuarios.find((u) => u.dni === dni);

    if (usuarioExistente) {
        return res.status(400).json({
            message: "El usuario ya existe",
        });
    }

    usuarios.push({ dni, password });

    console.log("Usuarios:", usuarios);

    return res.status(201).json({
        message: "Registro exitoso",
        user: {
            dni,
        },
    });
};

const login = (req, res) => {
    const { dni, password } = req.body;

    if (!dni || !password) {
        return res.status(400).json({
            message: "DNI y password son obligatorios",
        });
    }

    const usuario = usuarios.find((u) => u.dni === dni);

    if (!usuario || usuario.password !== password) {
        return res.status(401).json({
            message: "Credenciales incorrectas",
        });
    }

    return res.status(200).json({
        message: "Login correcto",
    });
};

module.exports = {
    register,
    login,
};