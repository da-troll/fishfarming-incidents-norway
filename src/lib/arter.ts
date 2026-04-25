// FAO ASFIS species codes seen in Norwegian aquaculture.
// Reference: https://www.fao.org/fishery/en/collection/asfis/en
export const ARTER_LABELS: Record<string, string> = {
  SAL: "Atlantisk laks",
  TRR: "Regnbueørret",
  TRO: "Ørret",
  COD: "Torsk",
  HAL: "Kveite",
  HAD: "Hyse",
  SCO: "Kongekrabbe",
  CRA: "Krabbe",
  ABK: "Røye",
  CHR: "Røye",
  EEL: "Ål",
  CHA: "Røye",
  FLO: "Flyndre",
  POL: "Sei",
  SPR: "Brisling",
  WHB: "Kolmule",
};

export const artLabel = (code: string): string => ARTER_LABELS[code] ?? code;
