"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the element comes within `margin` of the viewport, and stays true.
 * Native loading="lazy" fetches a screen or two ahead; this only fetches what is about to be seen.
 */
export function useInView<T extends Element>(margin = "200px"): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [margin]);

  return [ref, inView];
}
