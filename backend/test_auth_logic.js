const supabase = require('./src/config/supabase');
const bcrypt = require('bcryptjs');

async function testAuthLogic() {
    console.log('Testing login logic for DNI 11111111...');
    
    const dni = '11111111';
    
    // 1. Fetch from supabase
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nombre_apellido, dni, tipo_usuario, password')
        .eq('dni', dni);
        
    console.log('Error:', error);
    console.log('Profiles Length:', profiles ? profiles.length : null);
    
    if (profiles && profiles.length > 0) {
        console.log('Profile DNI:', profiles[0].dni);
        console.log('Profile has password:', !!profiles[0].password);
    }
}

testAuthLogic();
