import { useEffect } from "react";
import { latLngBounds } from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { WetlandFeature } from "../data/source";

interface Props {
  wetlands: WetlandFeature[];
  selected: number;
  onSelect: (id: number) => void;
}

function FitWetlandsBounds({ wetlands }: { wetlands: WetlandFeature[] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = latLngBounds([]);
    for (const wetland of wetlands) {
      for (const ring of wetland.geometry.coordinates) {
        for (const [longitude, latitude] of ring) {
          bounds.extend([latitude, longitude]);
        }
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 14 });
    }
  }, [map, wetlands]);

  return null;
}

export function WetlandMap({ wetlands, selected, onSelect }: Props) {
  const [lon, lat] = wetlands[0]?.geometry.coordinates[0][0] ?? [-67, -25.4];

  return (
    <MapContainer center={[lat, lon]} zoom={11} className="map">
      <FitWetlandsBounds wetlands={wetlands} />
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
