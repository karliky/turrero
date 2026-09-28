"use client";

import Image, { type ImageProps } from "next/image";
import { useInView } from "./useInView";

interface LazyImageProps extends ImageProps {
  /** Classes of the empty box shown until the image is about to be seen: give it the image's size. */
  placeholderClassName: string;
}

/** next/image that is not requested until it is about to enter the viewport. */
export function LazyImage({ placeholderClassName, alt, ...props }: LazyImageProps) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  if (!inView) return <span ref={ref} aria-hidden className={`block ${placeholderClassName}`} />;
  return <Image loading="lazy" alt={alt} {...props} />;
}
