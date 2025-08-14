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

export const fromXtoAuthor = (x: string): Author => {
  // I don't like this, but it's a quick fix
  if (x === AUTHORS.RECUENCO.X) return AUTHORS.RECUENCO;
  if (x === AUTHORS.VICTOR.X) return AUTHORS.VICTOR;
  
  return AUTHORS.CPSCOMUNIDAD;
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

