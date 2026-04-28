import L from "leaflet";
import {MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {useState} from "react";
import {centrosMock} from "../data/centrosMock"

const iconGuardia = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34],
    shadowSize: [41,41],
});

const iconFarmacia = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor:[12,41],
    popupAnchor: [1,-34],
    shadowSize: [41,41],
});

const centros = centrosMock;

function RecentMap({position}: {position: [number,number] | null}) {
    const map = useMap();

    if(position) {
        map.flyTo(position,15);
    }
    return null;
}

function EmergencyMapPage() {
    const [filtro, setFiltro] = useState("todos");
    const [ubicacionUsuario, setUbicacionUsuario] =
    useState<[number,number] | null>(null);

    const handleUbicacion=() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords: [number, number] = [
                    pos.coords.latitude,
                    pos.coords.longitude,
                ];

                setUbicacionUsuario(coords);
            },
            () => {
                alert("No se pudo obtener tu ubicación");
            }
        );
    };

    return(
        <div>
            <h1>Mapa de guardias y farmacias</h1>

            <div style={{marginBottom: "10px", display: "flex", gap: "8px"}}>
                <button onClick={() => setFiltro("todos")}>Todos</button>
                <button onClick={() => setFiltro("guardia")}>Guardias</button>
                <button onClick={() => setFiltro("farmacia")}>Farmacias</button>
                <button onClick={handleUbicacion}>Mi ubicación</button>
            </div>

            <MapContainer
                center={[-34.457, -58.861]}
                zoom={13}
                style={{height: "500px", width: "100%" }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {centros
                    .filter((centro) =>
                        filtro === "todos" ? true : centro.tipo === filtro
                    )
                    .map((centro) => (
                    <Marker
                    key={centro.id}
                    position={[centro.latitud, centro.longitud]}
                    icon={centro.tipo === "guardia" ? iconGuardia : iconFarmacia}
                    >
                        <Popup>
                            <strong>{centro.nombre}</strong>
                            <br />
                            {centro.direccion}
                            <br />
                            {centro.tipo === "guardia" ? "Guardia" : "Farmacia"}
                        </Popup>
                    </Marker>
                    ))}
                    ))
                {ubicacionUsuario && (
                    <Marker position={ubicacionUsuario}>
                        <Popup>
                            Estás acá
                        </Popup>
                    </Marker>
                )}
                <RecentMap position={ubicacionUsuario} />
            </MapContainer>
        </div>
    );
}

export default EmergencyMapPage;