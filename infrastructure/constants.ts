export type Authors = {
  MAIN: string,
  CPSCOMUNITY: Author,
  VICTOR: Author,
  RECUENCO: Author
}

export type Author = {
  NAME: string,
  X: string,
  YOUTUBE: string
}

export const fromXtoAuthor = (x: string) => {
  // I don't like this, but it's a quick fix
  if (x === AUTHORS.RECUENCO.X) return AUTHORS.RECUENCO;
  if (x === AUTHORS.VICTOR.X) return AUTHORS.VICTOR;
  
  return AUTHORS.CPSCOMUNITY;
}

export const AUTHORS : Authors = {
  MAIN: "Javier G. Recuenco y la Comunidad CPS",
  CPSCOMUNITY: {
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

