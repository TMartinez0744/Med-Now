import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { centrosMock } from "../data/centrosMock";
import Navbar from "../components/Navbar";

const iconGuardia = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const iconUsuario = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const iconFarmacia24h = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const iconFarmaciaRegular = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function RecentMap({ position }: { position: [number, number] | null }) {
    const map = useMap();
    if (position) {
        map.flyTo(position, 15);
    }
    return null;
}

const FILTROS_OPCIONES = [
    { key: "guardia", label: "Guardias" },
    { key: "farmacia24h", label: "Farmacias 24h" },
    { key: "farmacia", label: "Farmacias" },
];

function EmergencyMapPage() {
    const [filtros, setFiltros] = useState<string[]>([]);

    const toggleFiltro = (key: string) => {
        setFiltros((prev) =>
            prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
        );
    };
    const [ubicacionUsuario, setUbicacionUsuario] = useState<[number, number] | null>(null);

    const role: "doctor" | "patient" = localStorage.getItem("doctorData") ? "doctor" : "patient";

    const handleUbicacion = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUbicacionUsuario([pos.coords.latitude, pos.coords.longitude]);
            },
            () => {
                alert("No se pudo obtener tu ubicación");
            }
        );
    };

    const abrirRuta = (destLat: number, destLng: number) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUbicacionUsuario([pos.coords.latitude, pos.coords.longitude]);
            },
            () => {}
        );
        window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`,
            "_blank"
        );
    };

    return (
        <div className="dashboard-container" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", paddingBottom: "76px" }}>
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-name">Guardias y Farmacias</h2>
                    <p className="dashboard-sub">Encontrá centros cerca de tu ubicación</p>
                </div>
            </div>

            <div className="dashboard-card">
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <button
                        className={`specialty-chip ${filtros.length === 0 ? "active" : ""}`}
                        onClick={() => setFiltros([])}
                    >
                        Todos
                    </button>
                    {FILTROS_OPCIONES.map((f) => (
                        <button
                            key={f.key}
                            className={`specialty-chip ${filtros.includes(f.key) ? "active" : ""}`}
                            onClick={() => toggleFiltro(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <button className="auth-button" onClick={handleUbicacion}>
                    Mi ubicación
                </button>
            </div>

            <div className="dashboard-card" style={{ flex: 1, minHeight: 0, padding: 0, overflow: "hidden" }}>
                <MapContainer
                    center={[-34.62, -58.44]}
                    zoom={10}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {centrosMock
                        .filter((centro) => {
                            if (filtros.length === 0) return true;
                            return filtros.some((f) => {
                                if (f === "guardia") return centro.tipo === "guardia";
                                if (f === "farmacia24h") return centro.tipo === "farmacia" && centro.abierto_24h;
                                if (f === "farmacia") return centro.tipo === "farmacia" && !centro.abierto_24h;
                                return false;
                            });
                        })
                        .map((centro) => (
                            <Marker
                                key={centro.id}
                                position={[centro.latitud, centro.longitud]}
                                icon={
                                    centro.tipo === "guardia"
                                        ? iconGuardia
                                        : centro.abierto_24h
                                        ? iconFarmacia24h
                                        : iconFarmaciaRegular
                                }
                            >
                                <Popup>
                                    <strong>{centro.nombre}</strong>
                                    <br />
                                    {centro.direccion}
                                    <br />
                                    {centro.tipo === "guardia" ? "Guardia" : centro.abierto_24h ? "Farmacia 24h" : "Farmacia"}
                                    <br /><br />
                                    <button
                                        onClick={() => abrirRuta(centro.latitud, centro.longitud)}
                                        style={{
                                            padding: "6px 14px",
                                            background: "#2f5cf5",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Cómo llegar
                                    </button>
                                </Popup>
                            </Marker>
                        ))}
                    {ubicacionUsuario && (
                        <Marker position={ubicacionUsuario} icon={iconUsuario}>
                            <Popup>Estás acá</Popup>
                        </Marker>
                    )}
                    <RecentMap position={ubicacionUsuario} />
                </MapContainer>
            </div>

            <Navbar role={role} />
        </div>
    );
}

export default EmergencyMapPage;
