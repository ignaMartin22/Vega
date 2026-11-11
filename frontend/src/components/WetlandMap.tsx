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
        for (const [longitude, latitude] of ring) bounds.extend([latitude, longitude]);
      }
    }
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { maxZoom: 14 });
  }, [map, wetlands]);
  return null;
}

export function WetlandMap({ wetlands, selected, onSelect }: Props) {
  const [longitude, latitude] = wetlands[0]?.geometry.coordinates[0][0] ?? [-67, -25.4];
  return (
    <MapContainer center={[latitude, longitude]} zoom={11} className="map">
      <FitWetlandsBounds wetlands={wetlands} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {wetlands.map((wetland) => (
        <GeoJSON
          key={`${wetland.properties.wetlandId}-${selected}`}
          data={wetland as any}
          style={{ color: wetland.properties.wetlandId === selected ? "#28a6a1" : "#658b68", weight: wetland.properties.wetlandId === selected ? 3 : 2, fillOpacity: 0.16 }}
          eventHandlers={{ click: () => onSelect(wetland.properties.wetlandId) }}
        />
      ))}
    </MapContainer>
  );
}
