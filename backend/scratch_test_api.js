async function testRegister() {
    const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            dni: '44445555',
            password: 'mypassword',
            nombre_apellido: 'API Test User',
            tipo_usuario: 'paciente'
        })
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
}

testRegister();
