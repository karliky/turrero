export type Authors = {
  MAIN: string,
  CPSCOMUNITY: Author,
  RECUENCO: Author
}

export type Author = {
  NAME: string,
  X: string,
  YOUTUBE: string
}

export const AUTHORS : Authors = {
  MAIN: "Javier G. Recuenco y la Comunidad CPS",
  CPSCOMUNITY: {
    NAME: "Comunidad CPS",
    X: "https://x.com/CPSComunidad",
    YOUTUBE: "https://youtube.com/@cpsspain"
  },
  RECUENCO: {
    NAME: "Javier G. Recuenco",
    X: "https://x.com/Recuenco",
    YOUTUBE: "https://www.youtube.com/results?search_query=Javier+Recuenco"
  }
} as const;

