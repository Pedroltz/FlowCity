"""Rebuild the pinned SNDlib catalog from its original XML files.

Default: local XML only. --verify checks every committed output without writing.
--download fetches the pinned revision and verifies checksums after first import.
"""
import argparse
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / "datasets/case-studies"
REVISION = "d945c0484678f35a93483ca1ff0b8ebc999e9d03"
SOURCE = (
    "https://raw.githubusercontent.com/sands-lab/nika/"
    f"{REVISION}/src/nika/net_env/isp/sndlib/{{}}/network.xml"
)
NETWORKS = [
    "abilene", "atlanta", "brain", "cost266", "dfn-bwin", "dfn-gwin",
    "di-yuan", "france", "geant", "germany50", "giul39", "india35",
    "janos-us", "janos-us-ca", "newyork", "nobel-eu", "nobel-germany",
    "nobel-us", "norway", "pdh", "pioro40", "polska", "sun", "ta1",
    "ta2", "zib54",
]
# These SNDlib instances encode arcs, not bidirectional physical links.
DIRECTED_NETWORKS = {"giul39", "janos-us", "janos-us-ca", "sun", "zib54"}
NS = {"n": "http://sndlib.zib.de/network"}


def capacity_for(link, name):
    installed = Decimal(
        link.findtext("n:preInstalledModule/n:capacity", "0", NS)
    )
    if name in {"abilene", "atlanta"}:
        return installed

    modules = [
        Decimal(capacity.text)
        for capacity in link.findall(
            "n:additionalModules/n:addModule/n:capacity", NS
        )
        if Decimal(capacity.text) > 0
    ]
    return min(modules) if modules else installed


def unit_label(value):
    return {
        "MBITPERSEC": "Mbit/s",
        "BITSPERSEC": "bit/s",
        "KBITPERSEC": "kbit/s",
        "GBITPERSEC": "Gbit/s",
    }.get(value, "unidades de capacidade do benchmark")


def convert(name, previous, raw):
    tree = ET.fromstring(raw)
    xml_nodes = tree.findall(".//n:node", NS)
    coordinates = [
        (
            float(node.findtext("n:coordinates/n:x", namespaces=NS)),
            float(node.findtext("n:coordinates/n:y", namespaces=NS)),
        )
        for node in xml_nodes
    ]
    low_x, high_x = min(x for x, _ in coordinates), max(x for x, _ in coordinates)
    low_y, high_y = min(y for _, y in coordinates), max(y for _, y in coordinates)
    nodes = [
        {
            "id": node.attrib["id"],
            "name": node.attrib["id"],
            "x": round(60 + (x - low_x) * 800 / (high_x - low_x or 1), 3),
            "y": round(60 + (high_y - y) * 500 / (high_y - low_y or 1), 3),
        }
        for node, (x, y) in zip(xml_nodes, coordinates)
    ]
    directed = name in DIRECTED_NETWORKS
    edges, links = [], []
    for link in tree.findall(".//n:link", NS):
        ident = link.attrib["id"]
        source = link.findtext("n:source", namespaces=NS)
        target = link.findtext("n:target", namespaces=NS)
        capacity = capacity_for(link, name)
        if (
            not capacity.is_finite()
            or capacity != int(capacity)
            or not 0 <= capacity <= 2147483647
        ):
            raise ValueError(f"{name}/{ident}: capacity cannot be represented exactly")
        edge_ids = [ident + ":forward"]
        edges.append(
            {
                "id": edge_ids[0],
                "source": source,
                "target": target,
                "capacity": int(capacity),
                "flow": 0,
            }
        )
        if not directed:
            edge_ids.append(ident + ":backward")
            edges.append(
                {
                    "id": edge_ids[1],
                    "source": target,
                    "target": source,
                    "capacity": int(capacity),
                    "flow": 0,
                }
            )
        links.append(
            {
                "id": ident,
                "edgeIds": edge_ids,
                "source": source,
                "target": target,
                "directed": directed,
            }
        )

    metadata = {
        tag: tree.findtext(f"n:meta/n:{tag}", namespaces=NS)
        for tag in ["time", "unit", "origin", "granularity"]
    }
    if name in {"abilene", "atlanta"}:
        policy = "Capacidade pré-instalada; ausência representa zero."
    else:
        policy = (
            "Um módulo positivo de menor capacidade por enlace; configuração "
            "hipotética de projeto, não uma medição da rede instalada."
        )

    xml_path = ROOT / "originals" / f"{name}.xml"
    return {
        "id": name,
        "unit": unit_label(metadata["unit"]),
        "sourceUrl": previous.get("sourceUrl", SOURCE.format(name)),
        "revision": previous.get("revision", REVISION),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "retrievedAt": previous.get(
            "retrievedAt",
            datetime.fromtimestamp(xml_path.stat().st_mtime, timezone.utc).isoformat(),
        ),
        "sourceMetadata": metadata,
        "capacityPolicy": policy,
        "links": links,
        "graph": {
            "name": name.upper(),
            "description": (
                "Topologia SNDlib histórica; capacidade teórica para um par de "
                "pontos, sem tráfego concorrente."
            ),
            "nodes": nodes,
            "edges": edges,
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    if args.verify and args.download:
        parser.error("--verify cannot download or write files")

    for name in NETWORKS:
        path = ROOT / f"{name}.json"
        previous = json.loads(path.read_text()) if path.exists() else {}
        xml_path = ROOT / "originals" / f"{name}.xml"
        url = previous.get("sourceUrl", SOURCE.format(name))
        raw = urllib.request.urlopen(url, timeout=30).read() if args.download else xml_path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if previous.get("sha256") and digest != previous["sha256"]:
            raise ValueError(f"{name}: checksum mismatch against pinned source")
        converted = convert(name, previous, raw)
        if args.verify:
            if converted != previous:
                raise ValueError(f"{name}: generated data differs from manifest")
        else:
            if args.download:
                xml_path.parent.mkdir(parents=True, exist_ok=True)
                xml_path.write_bytes(raw)
            path.write_text(json.dumps(converted, indent=2, ensure_ascii=False) + "\n")
        print(
            f"{name}: verified {len(converted['graph']['nodes'])} nodes, "
            f"{len(converted['links'])} links"
        )


if __name__ == "__main__":
    main()
