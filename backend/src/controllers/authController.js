let usuarios = [];

const register = (req, res) => {
    const { email, password } = req.body;

    console.log("Datos recibidos en register:", email, password);

    if (!email || !password) {
        return res.status(400).json({
            message: "Email y password son obligatorios",
        });
    }

    if (!email.includes("@")) {
        return res.status(400).json({
            message: "Email inválido",
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "La contraseña debe tener al menos 6 caracteres",
        });
    }

    const usuarioExistente = usuarios.find((u) => u.email === email);

    if (usuarioExistente) {
        return res.status(400).json({
            message: "El usuario ya existe",
        });
    }

    usuarios.push({ email, password });

    console.log("Usuarios:", usuarios);

    return res.status(201).json({
        message: "Registro funcionando correctamente",
        user: {
            email: email,
        },
    });
};

const login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email y password son obligatorios",
        });
    }

    const usuario = usuarios.find((u) => u.email === email);

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