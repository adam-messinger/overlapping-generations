export interface CommutingOrigin {
  employedResidents: number;
  externalFlows: Map<string, number>;
}
export interface MarketAssignment {
  code: string;
  linkedDestination: string;
  employedResidents: number;
  largestExternalFlow: number;
  largestExternalShare: number;
  market: string;
}

function strongestExternal(origin: string, data: CommutingOrigin): [string, number] | null {
  const candidates = [...data.externalFlows]
    .filter(([destination, flow]) => destination !== origin && flow > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return candidates[0] ?? null;
}

function resolveMarkets(links: Map<string, string>): Map<string, string> {
  const result = new Map<string, string>();
  for (const start of links.keys()) {
    if (result.has(start)) continue;
    const path: string[] = [];
    const position = new Map<string, number>();
    let current = start;
    let market: string | null = null;
    while (market === null) {
      const known = result.get(current);
      if (known) {
        market = known;
        break;
      }
      const cycleStart = position.get(current);
      if (cycleStart !== undefined) {
        const cycle = path.slice(cycleStart);
        market = [...cycle].sort()[0];
        for (const member of cycle) result.set(member, market);
        break;
      }
      position.set(current, path.length);
      path.push(current);
      current = links.get(current) ?? current;
    }
    for (const member of path) result.set(member, market);
  }
  return result;
}

/** Apply the frozen 10% dominant-external-flow basin algorithm. */
export function buildCommutingBasins(
  origins: Map<string, CommutingOrigin>,
  threshold = 0.10,
): MarketAssignment[] {
  const links = new Map<string, string>();
  const strongest = new Map<string, [string, number] | null>();
  for (const [code, data] of origins) {
    const best = strongestExternal(code, data);
    strongest.set(code, best);
    const share = best && data.employedResidents > 0 ? best[1] / data.employedResidents : 0;
    links.set(code, best && share >= threshold && origins.has(best[0]) ? best[0] : code);
  }
  const markets = resolveMarkets(links);
  return [...origins].map(([code, data]) => {
    const best = strongest.get(code);
    const flow = best?.[1] ?? 0;
    return {
      code,
      linkedDestination: links.get(code)!,
      employedResidents: data.employedResidents,
      largestExternalFlow: flow,
      largestExternalShare: data.employedResidents > 0 ? flow / data.employedResidents : 0,
      market: markets.get(code)!,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));
}
