import { Navigate } from "react-router-dom";

interface Props {
    children: React.ReactNode;
    role: "patient" | "doctor";
}

function ProtectedRoute({ children, role }: Props) {
    const token = localStorage.getItem("token");
    const data = localStorage.getItem(role === "patient" ? "patientData" : "doctorData");

    if (!token || !data) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

export default ProtectedRoute;
