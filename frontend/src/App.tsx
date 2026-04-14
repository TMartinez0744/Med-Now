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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login/patient" element={<PatientLoginPage />} />
        <Route path="/login/doctor" element={<DoctorLoginPage />} />
        <Route path="/register/patient" element={<PatientRegisterPage />} />
        <Route path="/register/doctor" element={<DoctorRegisterPage />} />
        <Route path="/patient/dashboard" element={<PatientDashboardPage />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
        <Route path="/patient/turnos" element={<TurnosPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;