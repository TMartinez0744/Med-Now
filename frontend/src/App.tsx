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
import DoctorTurnosPage from "./pages/DoctorTurnosPage";
import PatientChatPage from "./pages/PatientChatPage";
import DoctorChatPage from "./pages/DoctorChatPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Toaster from "./components/Toaster";
import EmergencyMapPage from "./pages/EmergencyMapPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import AuthCallback from "./pages/AuthCallback";

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
                <Route path="/auth/callback" element={<AuthCallback />} />

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

                <Route
                    path="/doctor/turnos"
                    element={
                        <ProtectedRoute role="doctor">
                            <DoctorTurnosPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/patient/chat"
                    element={
                        <ProtectedRoute role="patient">
                            <PatientChatPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/patient/chat/:roomId"
                    element={
                        <ProtectedRoute role="patient">
                            <ChatRoomPage role="patient" />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/doctor/chat"
                    element={
                        <ProtectedRoute role="doctor">
                            <DoctorChatPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/doctor/chat/:roomId"
                    element={
                        <ProtectedRoute role="doctor">
                            <ChatRoomPage role="doctor" />
                        </ProtectedRoute>
                    }
                />

                <Route path="/mapa-emergencias" element={<EmergencyMapPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
