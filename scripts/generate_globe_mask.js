const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

const atlasPath = path.join(__dirname, '..', 'node_modules', 'world-atlas', 'land-110m.json');
const outPath = path.join(__dirname, '..', 'data', 'globe-land-mask.json');

const topology = JSON.parse(fs.readFileSync(atlasPath, 'utf8'));
const featureCollection = topojson.feature(topology, topology.objects.land);

function normalizeLongitude(lon) {
  return lon < 0 ? lon + 360 : lon;
}

function normalizeRings(rings) {
  return rings.map((ring) => ring.map(([lon, lat]) => [normalizeLongitude(lon), lat]));
}

function pointInPolygon(pointLon, pointLat, polygon) {
  const rings = normalizeRings(polygon);
  let inside = false;

  for (const ring of rings) {
    let isInsideRing = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];

      const intersects = ((yi > pointLat) !== (yj > pointLat)) &&
        (pointLon < ((xj - xi) * (pointLat - yi)) / (yj - yi) + xi);

      if (intersects) {
        isInsideRing = !isInsideRing;
      }
    }

    if (isInsideRing) {
      inside = !inside;
    }
  }

  return inside;
}

function extractLandCoordinates() {
  const coordinates = [];
  const feature = featureCollection.features[0];
  if (!feature || !feature.geometry) return coordinates;

  const geometry = feature.geometry;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    const rings = polygon;
    if (!rings || rings.length === 0) continue;

    const normalizedRings = normalizeRings(rings);
    for (let lon = -179.75; lon <= 179.75; lon += 0.5) {
      for (let lat = -89.75; lat <= 89.75; lat += 0.5) {
        const normalizedLon = lon < 0 ? lon + 360 : lon;
        if (pointInPolygon(normalizedLon, lat, normalizedRings)) {
          coordinates.push({ lon: Number(lon.toFixed(2)), lat: Number(lat.toFixed(2)) });
        }
      }
    }
  }

  return coordinates;
}

function filterSmallComponents(cells) {
  const keyMap = new Map();
  const neighbors = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];

  const queue = [];
  const visited = new Set();
  const components = [];

  for (const cell of cells) {
    const key = `${cell.lon.toFixed(2)}:${cell.lat.toFixed(2)}`;
    if (visited.has(key)) continue;

    const component = [];
    queue.push(cell);
    visited.add(key);

    while (queue.length) {
      const current = queue.shift();
      const currentKey = `${current.lon.toFixed(2)}:${current.lat.toFixed(2)}`;
      component.push(currentKey);

      for (const [dx, dy] of neighbors) {
        const nextLon = Number((current.lon + dx).toFixed(2));
        const nextLat = Number((current.lat + dy).toFixed(2));
        const nextKey = `${nextLon.toFixed(2)}:${nextLat.toFixed(2)}`;

        if (!keyMap.has(nextKey) || visited.has(nextKey)) continue;
        visited.add(nextKey);
        queue.push({ lon: nextLon, lat: nextLat });
      }
    }

    if (component.length >= 4) {
      components.push(component);
    }
  }

  return components;
}

function buildCellLookup(cells) {
  const lookup = new Map();
  for (const cell of cells) {
    lookup.set(`${cell.lon.toFixed(2)}:${cell.lat.toFixed(2)}`, true);
  }
  return lookup;
}

function main() {
  const cells = extractLandCoordinates();
  const lookup = buildCellLookup(cells);
  const cleaned = [];
  const visited = new Set();
  const stack = [];

  for (const cell of cells) {
    const key = `${cell.lon.toFixed(2)}:${cell.lat.toFixed(2)}`;
    if (visited.has(key)) continue;

    const component = [];
    stack.push(cell);
    visited.add(key);

    while (stack.length) {
      const current = stack.pop();
      const currentKey = `${current.lon.toFixed(2)}:${current.lat.toFixed(2)}`;
      component.push(currentKey);

      const neighbors = [
        [0, 0.5], [0.5, 0], [0, -0.5], [-0.5, 0]
      ];

      for (const [dx, dy] of neighbors) {
        const nextLon = Number((current.lon + dx).toFixed(2));
        const nextLat = Number((current.lat + dy).toFixed(2));
        const nextKey = `${nextLon.toFixed(2)}:${nextLat.toFixed(2)}`;
        if (!lookup.has(nextKey) || visited.has(nextKey)) continue;
        visited.add(nextKey);
        stack.push({ lon: nextLon, lat: nextLat });
      }
    }

    if (component.length >= 4) {
      for (const item of component) {
        const [lon, lat] = item.split(':').map(Number);
        cleaned.push({ lon, lat });
      }
    }
  }

  const deduped = [...new Map(cleaned.map((cell) => [`${cell.lon.toFixed(2)}:${cell.lat.toFixed(2)}`, cell])).values()];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));

  console.log(`Wrote ${deduped.length} land cells to ${outPath}`);
}

main();
