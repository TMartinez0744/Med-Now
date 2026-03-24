import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function PatientRegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dni, setDni] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const dniRegex = /^\d{7,8}$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!name || !lastName || !dni || !password || !confirmPassword) {
            alert("Completá todos los campos");
            return;
        }

        if (!dniRegex.test(dni)) {
            alert("El DNI debe tener 7 u 8 números");
            return;
        }

        if (!passwordRegex.test(password)) {
            alert("La contraseña debe tener al menos 8 caracteres, una letra y un número");
            return;
        }

        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }

        navigate("/patient/dashboard");
    };

    return (
        <div>
            <h1>Registro Paciente</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nombre</label>
                    <br />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ingresá tu nombre"
                    />
                </div>

                <br />

                <div>
                    <label>Apellido</label>
                    <br />
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ingresá tu apellido"
                    />
                </div>

                <br />

                <div>
                    <label>DNI</label>
                    <br />
                    <input
                        type="text"
                        value={dni}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setDni(value);
                        }}
                        placeholder="Ingresá tu DNI"
                    />
                </div>

                <br />

                <div>
                    <label>Contraseña</label>
                    <br />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingresá tu contraseña"
                    />
                </div>

                <br />

                <div>
                    <label>Confirmar contraseña</label>
                    <br />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repetí tu contraseña"
                    />
                </div>

                <br />

                <button type="submit">Registrarse</button>
            </form>

            <br />

            <Link to="/login/patient">
                <button>Volver al login</button>
            </Link>
        </div>
    );
}

export default PatientRegisterPage;