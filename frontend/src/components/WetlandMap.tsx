import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { WetlandFeature } from "../data/source";

interface Props {
  wetlands: WetlandFeature[];
  selected: number;
  onSelect: (id: number) => void;
}

export function WetlandMap({ wetlands, selected, onSelect }: Props) {
  const [lon, lat] = wetlands[0]?.geometry.coordinates[0][0] ?? [-67, -25.4];
  return (
    <MapContainer center={[lat, lon]} zoom={11} className="map">
      {/* TODO(Frontend): capa base NASA GIBS o Sentinel-2 true color */}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      {wetlands.map((w) => (
        <GeoJSON
          key={`${w.properties.wetlandId}-${selected}`}
          data={w as any}
          style={{ color: w.properties.wetlandId === selected ? "#2563eb" : "#64748b", weight: 2 }}
          eventHandlers={{ click: () => onSelect(w.properties.wetlandId) }}
        />
      ))}
    </MapContainer>
  );
}
