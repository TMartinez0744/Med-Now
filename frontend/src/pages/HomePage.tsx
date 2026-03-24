import {Link} from "react-router-dom";

function HomePage(){
    return(
        <div>
            <h1>MedNow</h1>
            <p>Elegi tu perfil</p>

            <Link to="/login/patient">
                <button>Soy paciente</button>
            </Link>

            <Link to="/login/doctor">
                <button>Soy medico</button>
            </Link>
        </div>
    );
}
export default HomePage;