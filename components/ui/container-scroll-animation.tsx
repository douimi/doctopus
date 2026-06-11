'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Scroll-driven hero scaffold (3D card rises into place as the user
 * scrolls into the section). Animation layer left exactly as the source
 * specifies — only the surface colors are remapped onto the project's
 * tokens. The outer "device" frame intentionally stays dark in both
 * themes to keep the screen-inside-bezel illusion intact; only the
 * inner content surface follows the theme via `bg-muted`.
 *
 * Usage:
 *   <ContainerScroll titleComponent={<h1>…</h1>}>
 *     <Image … />
 *   </ContainerScroll>
 */
export function ContainerScroll({
  titleComponent,
  children,
  innerClassName,
}: {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  /** Override the inner "screen" surface (e.g. dark bg on the landing). */
  innerClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1]);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[60rem] md:h-[80rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{ perspective: '1000px' }}
      >
        <Header translate={translate}>{titleComponent}</Header>
        <Card rotate={rotate} translate={translate} scale={scale} innerClassName={innerClassName}>
          {children}
        </Card>
      </div>
    </div>
  );
}

function Header({
  translate,
  children,
}: {
  translate: MotionValue<number>;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="max-w-5xl mx-auto text-center"
    >
      {children}
    </motion.div>
  );
}

function Card({
  rotate,
  scale,
  children,
  innerClassName,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
  innerClassName?: string;
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
      className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-zinc-600 p-2 md:p-6 bg-zinc-900 rounded-[30px] shadow-2xl"
    >
      <div
        className={cn(
          'h-full w-full overflow-hidden rounded-2xl bg-muted md:rounded-2xl md:p-4',
          innerClassName,
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}
