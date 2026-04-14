async function testLogin() {
    const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            dni: '44445555',
            password: 'mypassword'
        })
    });
    const data = await res.json();
    console.log('Login Status:', res.status, data);
}
testLogin();
