import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Navbar from "../components/Navbar";
import { authFetch } from "../utils/authFetch";

// Iconos custom (usualmente leaflet tira error con los iconos por defecto en React)
const iconGuardia = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const iconFarmacia = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const iconUser = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

type Centro = {
    id: string;
    nombre: string;
    tipo: string;
    direccion: string;
    latitud: number;
    longitud: number;
    abierto_24h: boolean;
};

function UserLocation() {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const map = useMapEvents({
        locationfound(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
            map.flyTo(e.latlng, 14);
        },
    });

    useEffect(() => {
        map.locate();
    }, [map]);

    return position === null ? null : (
        <Marker position={position} icon={iconUser}>
            <Popup>
                <b>Estás aquí</b>
            </Popup>
        </Marker>
    );
}

function MapPage() {
    const navigate = useNavigate();
    const [centros, setCentros] = useState<Centro[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isDoctor = localStorage.getItem("doctorData") !== null;
    const role = isDoctor ? "doctor" : "patient";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/");
            return;
        }

        authFetch("http://localhost:3000/api/centros_emergencia")
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    // Solo tomamos los que tengan latitud y longitud validas
                    const validos = data.data.filter((c: any) => c.latitud != null && c.longitud != null);
                    setCentros(validos);
                } else {
                    setError("Error al cargar los centros.");
                }
            })
            .catch(err => {
                console.error(err);
                setError("Error de conexión al obtener puntos del mapa.");
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    // Centro inicial: Buenos Aires
    const defaultCenter: [number, number] = [-34.6037, -58.3816];

    return (
        <div style={{ paddingBottom: "70px", height: "100vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px", background: "white", zIndex: 1000, boxShadow: "0 2px 4px rgba(0,0,0,0.1)", position: "relative" }}>
                <h2 style={{ margin: 0, color: "#111827", fontSize: "1.5rem" }}>Centros y Farmacias</h2>
                <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
                    Encontrá guardias médicas (Rojo) y farmacias (Verde).
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <span style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ display:"inline-block", width:12, height:12, borderRadius:"50%", background:"#cb2b3e"}}></span> Guardias
                    </span>
                    <span style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ display:"inline-block", width:12, height:12, borderRadius:"50%", background:"#2aad27"}}></span> Farmacias
                    </span>
                </div>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
                {loading && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, background: "white", padding: "10px 20px", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                        Cargando mapa...
                    </div>
                )}
                
                {error && (
                    <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#fee2e2", color: "#ef4444", padding: "10px 20px", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                        {error}
                    </div>
                )}

                <MapContainer 
                    center={defaultCenter} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <UserLocation />

                    {centros.map(centro => {
                        const isFarmacia = centro.tipo.toLowerCase().includes("farmacia");
                        return (
                            <Marker 
                                key={centro.id} 
                                position={[centro.latitud, centro.longitud]}
                                icon={isFarmacia ? iconFarmacia : iconGuardia}
                            >
                                <Popup>
                                    <div style={{ textAlign: "center" }}>
                                        <b style={{ display: "block", fontSize: "14px", marginBottom: "4px", color: isFarmacia ? "#2aad27" : "#cb2b3e" }}>
                                            {centro.nombre}
                                        </b>
                                        <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "6px" }}>
                                            {centro.direccion}
                                        </div>
                                        {centro.abierto_24h && (
                                            <span style={{ fontSize: "11px", fontWeight: "bold", background: "#fef3c7", color: "#d97706", padding: "2px 6px", borderRadius: "4px" }}>
                                                Abierto 24hs
                                            </span>
                                        )}
                                        <br />
                                        <small style={{ color: "#9ca3af", marginTop: "4px", display: "inline-block" }}>
                                            ({isFarmacia ? "Farmacia" : "Guardia"})
                                        </small>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            <Navbar role={role as "doctor" | "patient"} />
        </div>
    );
}

export default MapPage;
