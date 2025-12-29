import { NextResponse } from "next/server";

type Facing = "north" | "east" | "south" | "west";

type GenerateInput = {
  plot: { width: number; height: number };
  facing: Facing;
  bedrooms: number; // 1..4 for now
  options?: {
    pooja?: boolean;
    parking?: boolean;
    study?: boolean;
  };
};

type Rect = { x: number; y: number; w: number; h: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function zoneOfPoint(x: number, y: number, W: number, H: number) {
  // Divide plot into 3x3 grid (zones)
  const col = x < W / 3 ? 0 : x < (2 * W) / 3 ? 1 : 2;
  const row = y < H / 3 ? 0 : y < (2 * H) / 3 ? 1 : 2;

  const cols = ["W", "C", "E"];
  const rows = ["N", "C", "S"];

  const r = rows[row];
  const c = cols[col];

  if (r === "C" && c === "C") return "CENTER";
  if (r === "C") return c; // W / C / E (we avoid "C" here except center)
  if (c === "C") return r; // N / S
  return `${r}${c}`; // NW, NE, SW, SE
}

function zoneOfRect(rect: Rect, W: number, H: number) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return zoneOfPoint(cx, cy, W, H);
}

function vastuScore(room: string, zone: string) {
  // Very simplified starter rules.
  // You can expand later.
  const good: Record<string, string[]> = {
    POOJA: ["NE"],
    KITCHEN: ["SE", "E"],
    MASTER_BED: ["SW"],
    BEDROOM: ["W", "NW", "S"],
    LIVING: ["N", "E", "NE", "C"],
    DINING: ["C", "E", "N"],
    TOILET: ["W", "NW", "S", "SE"],
    STAIRS: ["S", "SW", "W"],
    ENTRY: ["N", "E", "NE"],
  };

  const bad: Record<string, string[]> = {
    POOJA: ["SW", "SE"],
    KITCHEN: ["NE", "SW"],
    MASTER_BED: ["NE"],
    TOILET: ["NE", "CENTER"],
  };

  const g = good[room] ?? [];
  const b = bad[room] ?? [];

  if (b.includes(zone)) return { score: 0, note: "avoid" };
  if (g.includes(zone)) return { score: 2, note: "good" };
  return { score: 1, note: "neutral" };
}

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as GenerateInput;

    const W = clamp(Number(input.plot?.width ?? 0), 10, 200);
    const H = clamp(Number(input.plot?.height ?? 0), 10, 200);
    const facing: Facing = (input.facing ?? "east") as Facing;
    const bedrooms = clamp(Number(input.bedrooms ?? 2), 1, 4);

    // Simple rectangle plan (coordinates in plot units)
    // Convention: (0,0) is top-left. y increases downward.
    // Later you can rotate based on facing; for now we just store facing.

    const rooms: Array<{ id: string; name: string; rect: Rect; zone?: string }> =
      [];

    // Layout strategy (starter):
    // - Living in North/Center
    // - Kitchen in SE
    // - Master in SW
    // - Other bedrooms West/NW/S
    // - Toilets in West/NW/SE
    // All super rough; purpose is to get stable JSON outputs.

    const living: Rect = { x: 0, y: 0, w: W * 0.6, h: H * 0.4 };
    const kitchen: Rect = { x: W * 0.6, y: 0, w: W * 0.4, h: H * 0.4 };
    const master: Rect = { x: 0, y: H * 0.4, w: W * 0.5, h: H * 0.6 };

    rooms.push({ id: "living", name: "LIVING", rect: living });
    rooms.push({ id: "kitchen", name: "KITCHEN", rect: kitchen });
    rooms.push({ id: "master", name: "MASTER_BED", rect: master });

    // Extra bedrooms
    if (bedrooms >= 2) {
      rooms.push({
        id: "bed2",
        name: "BEDROOM",
        rect: { x: W * 0.5, y: H * 0.4, w: W * 0.5, h: H * 0.3 },
      });
    }
    if (bedrooms >= 3) {
      rooms.push({
        id: "bed3",
        name: "BEDROOM",
        rect: { x: W * 0.5, y: H * 0.7, w: W * 0.5, h: H * 0.3 },
      });
    }
    if (bedrooms >= 4) {
      rooms.push({
        id: "bed4",
        name: "BEDROOM",
        rect: { x: W * 0.25, y: H * 0.4, w: W * 0.25, h: H * 0.3 },
      });
    }

    // Optional pooja (small NE)
    if (input.options?.pooja) {
      rooms.push({
        id: "pooja",
        name: "POOJA",
        rect: { x: W * 0.7, y: H * 0.05, w: W * 0.25, h: H * 0.15 },
      });
    }

    // Toilets (keep away from NE/CENTER)
    rooms.push({
      id: "toilet1",
      name: "TOILET",
      rect: { x: W * 0.0, y: H * 0.25, w: W * 0.2, h: H * 0.15 },
    });

    // Entry placeholder (depends on facing; store as metadata for now)
    const entry = { side: facing, preferredZones: ["N", "E", "NE"] };

    // Compute zones + vastu checks
    const checks = rooms.map((r) => {
      const z = zoneOfRect(r.rect, W, H);
      r.zone = z;
      const res = vastuScore(r.name, z);
      return { room: r.name, id: r.id, zone: z, ...res };
    });

    const total = checks.reduce((s, c) => s + c.score, 0);
    const max = checks.length * 2;
    const percent = Math.round((total / max) * 100);

    return NextResponse.json({
      ok: true,
      input: { plot: { width: W, height: H }, facing, bedrooms, options: input.options ?? {} },
      plan: {
        units: "plot-units",
        origin: "top-left",
        entry,
        rooms,
      },
      vastu: {
        score: { total, max, percent },
        checks,
        notes: [
          "This is a starter rules engine (simplified). Next step is rotation by facing + better room sizing + adjacency rules.",
        ],
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}

