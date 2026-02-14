export interface Authors {
  readonly MAIN: string;
  readonly CPSCOMUNIDAD: Author;
  readonly VICTOR: Author;
  readonly RECUENCO: Author;
}

export interface Author {
  readonly NAME: string;
  readonly X: string;
  readonly YOUTUBE: string;
}

export const fromXtoAuthor = (x: string, displayName?: string): Author => {
  if (x === AUTHORS.RECUENCO.X) return AUTHORS.RECUENCO;
  if (x === AUTHORS.VICTOR.X) return AUTHORS.VICTOR;
  if (x === AUTHORS.CPSCOMUNIDAD.X) return AUTHORS.CPSCOMUNIDAD;

  const normalizedX = x.replace(/\/+$/, "");
  const handle = normalizedX.split("/").pop() || "unknown";

  return {
    NAME: displayName?.trim() || `@${handle}`,
    X: normalizedX,
    YOUTUBE: "",
  };
}

export const AUTHORS: Authors = {
  MAIN: "Javier G. Recuenco y la Comunidad CPS",
  CPSCOMUNIDAD: {
    NAME: "Comunidad CPS",
    X: "https://x.com/CPSComunidad",
    YOUTUBE: "https://youtube.com/@cpsspain"
  },
  VICTOR: {
    NAME: "Víctor R. Escobar",
    X: "https://x.com/nudpiedo",
    YOUTUBE: "https://youtube.com/@cpsspain"
  },
  RECUENCO: {
    NAME: "Javier G. Recuenco",
    X: "https://x.com/Recuenco",
    YOUTUBE: "https://www.youtube.com/results?search_query=Javier+Recuenco"
  }
} as const;
