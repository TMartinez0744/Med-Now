import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PatientLoginPage from "./pages/PatientLoginPage";
import DoctorLoginPage from "./pages/DoctorLoginPage";
import PatientRegisterPage from "./pages/PatientRegisterPage";
import DoctorRegisterPage from "./pages/DoctorRegisterPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import TurnosPage from "./pages/TurnosPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Toaster from "./components/Toaster";
import EmergencyMapPage from "./pages/EmergencyMapPage";

function App() {
    return (
        <BrowserRouter>
            <Toaster />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login/patient" element={<PatientLoginPage />} />
                <Route path="/login/doctor" element={<DoctorLoginPage />} />
                <Route path="/register/patient" element={<PatientRegisterPage />} />
                <Route path="/register/doctor" element={<DoctorRegisterPage />} />

                <Route
                    path="/patient/dashboard"
                    element={
                        <ProtectedRoute role="patient">
                            <PatientDashboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/doctor/dashboard"
                    element={
                        <ProtectedRoute role="doctor">
                            <DoctorDashboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/patient/turnos"
                    element={
                        <ProtectedRoute role="patient">
                            <TurnosPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="/mapa-emergencias" element={<EmergencyMapPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;